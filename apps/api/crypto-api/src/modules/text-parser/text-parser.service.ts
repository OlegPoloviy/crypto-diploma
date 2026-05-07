import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { join } from 'path';
import { Worker } from 'worker_threads';
import { Repository } from 'typeorm';
import { CreateParsedTextResponseDto } from './dto/create-parsed-text-response.dto';
import { ParsedTextResponseDto } from './dto/parsed-text-response.dto';
import {
  ParsedTextEntity,
  ParsedTextSource,
  ParsedTextStatus,
} from './parsed-text.entity';
import { ParsedTextResult, parseBookText } from './text-parser.util';

interface QueuedParseJob {
  id: string;
  text: string;
}

@Injectable()
export class TextParserService {
  private readonly logger = new Logger(TextParserService.name);
  private readonly queue: QueuedParseJob[] = [];
  private isProcessing = false;

  constructor(
    @InjectRepository(ParsedTextEntity)
    private readonly parsedTextsRepo: Repository<ParsedTextEntity>,
  ) {}

  parse(rawText: string): ParsedTextResponseDto {
    if (!rawText?.trim()) {
      throw new BadRequestException('Text cannot be empty');
    }

    return parseBookText(rawText);
  }

  async createFromText(
    title: string,
    text: string,
    originalFileName?: string,
  ): Promise<CreateParsedTextResponseDto> {
    if (!text?.trim()) {
      throw new BadRequestException('Text cannot be empty');
    }

    const parsedText = await this.parsedTextsRepo.save(
      this.parsedTextsRepo.create({
        title,
        source: ParsedTextSource.MANUAL,
        originalFileName,
        status: ParsedTextStatus.QUEUED,
      }),
    );

    this.enqueue({ id: parsedText.id, text });

    return this.toResponse(parsedText);
  }

  async createFromFile(
    title: string,
    file?: { buffer: Buffer; originalname?: string },
  ): Promise<CreateParsedTextResponseDto> {
    if (!file) {
      throw new BadRequestException('TXT file is required');
    }

    const filename = file.originalname?.toLowerCase();
    if (filename && !filename.endsWith('.txt')) {
      throw new BadRequestException('Only .txt files are supported');
    }

    const text = file.buffer.toString('utf8');
    if (!text.trim()) {
      throw new BadRequestException('Text cannot be empty');
    }

    const parsedText = await this.parsedTextsRepo.save(
      this.parsedTextsRepo.create({
        title,
        source: ParsedTextSource.UPLOAD,
        originalFileName: file.originalname,
        status: ParsedTextStatus.QUEUED,
      }),
    );

    this.enqueue({ id: parsedText.id, text });

    return this.toResponse(parsedText);
  }

  async findAll(): Promise<CreateParsedTextResponseDto[]> {
    const rows = await this.parsedTextsRepo.find({
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        title: true,
        source: true,
        originalFileName: true,
        status: true,
        totalWords: true,
        totalChars: true,
        uniqueWords: true,
        hurstExponent: true,
        dfaAlpha: true,
        wordFrequencyEntropy: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return rows.map((row) => this.toResponse(row));
  }

  async findOne(id: string): Promise<CreateParsedTextResponseDto> {
    const parsedText = await this.parsedTextsRepo.findOne({
      where: { id },
      select: {
        id: true,
        title: true,
        source: true,
        originalFileName: true,
        status: true,
        totalWords: true,
        totalChars: true,
        uniqueWords: true,
        hurstExponent: true,
        dfaAlpha: true,
        wordFrequencyEntropy: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!parsedText) {
      throw new NotFoundException(`Parsed text ${id} not found`);
    }

    return this.toResponse(parsedText);
  }

  async getWords(id: string): Promise<string[]> {
    const parsedText = await this.parsedTextsRepo.findOne({
      where: { id },
      select: {
        id: true,
        status: true,
        words: true,
      },
    });

    if (!parsedText) {
      throw new NotFoundException(`Parsed text ${id} not found`);
    }

    if (parsedText.status !== ParsedTextStatus.COMPLETED) {
      throw new BadRequestException(
        `Parsed text ${id} is not ready yet: ${parsedText.status}`,
      );
    }

    return parsedText.words ?? [];
  }

  private enqueue(job: QueuedParseJob): void {
    this.queue.push(job);
    void this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) {
        continue;
      }

      await this.processJob(job);
    }

    this.isProcessing = false;
  }

  private async processJob(job: QueuedParseJob): Promise<void> {
    await this.parsedTextsRepo.update(job.id, {
      status: ParsedTextStatus.PROCESSING,
      errorMessage: null,
    });

    try {
      const result = await this.runParserWorker(job.text);
      await this.parsedTextsRepo.update(job.id, {
        words: result.words,
        totalWords: result.totalWords,
        totalChars: result.totalChars,
        uniqueWords: result.uniqueWords,
        hurstExponent: result.hurstExponent,
        dfaAlpha: result.dfaAlpha,
        wordFrequencyEntropy: result.wordFrequencyEntropy,
        status: ParsedTextStatus.COMPLETED,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to parse text';
      this.logger.error(`Failed to parse text ${job.id}: ${message}`);

      await this.parsedTextsRepo.update(job.id, {
        status: ParsedTextStatus.FAILED,
        errorMessage: message,
      });
    }
  }

  private runParserWorker(text: string): Promise<ParsedTextResult> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(join(__dirname, 'text-parser.worker.js'), {
        workerData: { text },
      });

      worker.once(
        'message',
        (message: ParsedTextResult | { error: string }) => {
          if ('error' in message) {
            reject(new Error(message.error));
            return;
          }

          resolve(message);
        },
      );
      worker.once('error', reject);
      worker.once('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Parser worker stopped with exit code ${code}`));
        }
      });
    });
  }

  private toResponse(entity: ParsedTextEntity): CreateParsedTextResponseDto {
    return {
      id: entity.id,
      title: entity.title,
      source: entity.source,
      originalFileName: entity.originalFileName,
      status: entity.status,
      totalWords: entity.totalWords,
      totalChars: entity.totalChars,
      uniqueWords: entity.uniqueWords,
      hurstExponent: entity.hurstExponent,
      dfaAlpha: entity.dfaAlpha,
      wordFrequencyEntropy: entity.wordFrequencyEntropy,
      errorMessage: entity.errorMessage,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
