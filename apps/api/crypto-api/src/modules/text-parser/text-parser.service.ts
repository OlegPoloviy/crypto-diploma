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
import { calculateByteMetrics } from '../classical-ciphers/classical-ciphers.metrics';
import { CreateParsedTextResponseDto } from './dto/create-parsed-text-response.dto';
import { ParsedTextResponseDto } from './dto/parsed-text-response.dto';
import {
  ParsedTextContentEncoding,
  ParsedTextEntity,
  ParsedTextSource,
  ParsedTextStatus,
} from './parsed-text.entity';
import { ParsedTextResult, parseBookText } from './text-parser.util';

interface QueuedParseJob {
  id: string;
  text: string;
}

interface PreparedUpload {
  file: { buffer: Buffer; originalname?: string };
  text: string;
  encoding: ParsedTextContentEncoding;
  words?: string[];
}

export enum TextFileType {
  PLAIN_TEXT = 'plain-text',
  MARKDOWN = 'markdown',
  CSV = 'csv',
  JSON = 'json',
  BINARY = 'binary',
}

const TEXT_FILE_EXTENSIONS: Record<TextFileType, string[]> = {
  [TextFileType.PLAIN_TEXT]: ['.txt', '.text'],
  [TextFileType.MARKDOWN]: ['.md', '.markdown'],
  [TextFileType.CSV]: ['.csv'],
  [TextFileType.JSON]: ['.json'],
  [TextFileType.BINARY]: [],
};

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
        content: text,
        contentEncoding: ParsedTextContentEncoding.UTF8,
        status: ParsedTextStatus.QUEUED,
      }),
    );

    this.enqueue({ id: parsedText.id, text });

    return this.toResponse(parsedText);
  }

  async createFromFile(
    title: string,
    file?: { buffer: Buffer; originalname?: string },
    fileType = TextFileType.PLAIN_TEXT,
  ): Promise<CreateParsedTextResponseDto> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.createUploadJob(title, this.prepareUpload(file, fileType));
  }

  async createFromFiles(
    title: string,
    files?: { buffer: Buffer; originalname?: string }[],
    fileType = TextFileType.PLAIN_TEXT,
  ): Promise<CreateParsedTextResponseDto[]> {
    if (!files?.length) {
      throw new BadRequestException('At least one file is required');
    }

    const uploads = files.map((file) => this.prepareUpload(file, fileType));

    return Promise.all(
      uploads.map((upload) =>
        this.createUploadJob(
          this.buildBatchTitle(title, upload.file, uploads.length),
          upload,
        ),
      ),
    );
  }

  async createCompletedFromFiles(
    title: string,
    files?: { buffer: Buffer; originalname?: string }[],
    fileType = TextFileType.PLAIN_TEXT,
  ): Promise<CreateParsedTextResponseDto[]> {
    if (!files?.length) {
      throw new BadRequestException('At least one file is required');
    }

    const uploads = files.map((file) => this.prepareUpload(file, fileType));

    return Promise.all(
      uploads.map((upload) =>
        this.createCompletedUpload(
          this.buildBatchTitle(title, upload.file, uploads.length),
          upload,
        ),
      ),
    );
  }

  async findAll(): Promise<CreateParsedTextResponseDto[]> {
    const rows = await this.parsedTextsRepo.find({
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        title: true,
        source: true,
        originalFileName: true,
        contentEncoding: true,
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
        contentEncoding: true,
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

  private async createUploadJob(
    title: string,
    upload: PreparedUpload,
  ): Promise<CreateParsedTextResponseDto> {
    const metrics =
      upload.encoding === ParsedTextContentEncoding.HEX
        ? calculateByteMetrics(Buffer.from(upload.text, 'hex'))
        : undefined;
    const parsedText = await this.parsedTextsRepo.save(
      this.parsedTextsRepo.create({
        title,
        source: ParsedTextSource.UPLOAD,
        originalFileName: upload.file.originalname,
        content: upload.text,
        contentEncoding: upload.encoding,
        status:
          upload.encoding === ParsedTextContentEncoding.HEX
            ? ParsedTextStatus.COMPLETED
            : ParsedTextStatus.QUEUED,
        words: upload.words,
        totalWords: upload.words?.length ?? 0,
        totalChars: upload.text.length,
        uniqueWords: upload.words ? new Set(upload.words).size : 0,
        hurstExponent: metrics?.hurstExponent,
        dfaAlpha: metrics?.dfaAlpha,
        wordFrequencyEntropy: metrics?.wordFrequencyEntropy,
      }),
    );

    if (upload.encoding === ParsedTextContentEncoding.UTF8) {
      this.enqueue({ id: parsedText.id, text: upload.text });
    }

    return this.toResponse(parsedText);
  }

  private async createCompletedUpload(
    title: string,
    upload: PreparedUpload,
  ): Promise<CreateParsedTextResponseDto> {
    const metrics =
      upload.encoding === ParsedTextContentEncoding.HEX
        ? calculateByteMetrics(Buffer.from(upload.text, 'hex'))
        : parseBookText(upload.text);
    const words =
      upload.encoding === ParsedTextContentEncoding.HEX
        ? upload.words
        : (metrics as ParsedTextResult).words;
    const parsedText = await this.parsedTextsRepo.save(
      this.parsedTextsRepo.create({
        title,
        source: ParsedTextSource.UPLOAD,
        originalFileName: upload.file.originalname,
        content: upload.text,
        contentEncoding: upload.encoding,
        status: ParsedTextStatus.COMPLETED,
        words,
        totalWords: words?.length ?? 0,
        totalChars:
          upload.encoding === ParsedTextContentEncoding.HEX
            ? upload.text.length
            : (metrics as ParsedTextResult).totalChars,
        uniqueWords: words ? new Set(words).size : 0,
        hurstExponent: metrics.hurstExponent,
        dfaAlpha: metrics.dfaAlpha,
        wordFrequencyEntropy: metrics.wordFrequencyEntropy,
      }),
    );

    return this.toResponse(parsedText);
  }

  private prepareUpload(
    file: { buffer: Buffer; originalname?: string },
    fileType: TextFileType,
  ): PreparedUpload {
    this.assertSupportedTextFile(file, fileType);

    const isBinary = fileType === TextFileType.BINARY;
    const text = isBinary
      ? file.buffer.toString('hex')
      : file.buffer.toString('utf8');
    if (!text.trim()) {
      throw new BadRequestException('File cannot be empty');
    }

    return {
      file,
      text,
      encoding: isBinary
        ? ParsedTextContentEncoding.HEX
        : ParsedTextContentEncoding.UTF8,
      words: isBinary ? chunkText(text, 64) : undefined,
    };
  }

  private assertSupportedTextFile(
    file: { originalname?: string },
    fileType: TextFileType,
  ): void {
    const extensions = TEXT_FILE_EXTENSIONS[fileType];
    if (!extensions) {
      throw new BadRequestException(`Unsupported file type: ${fileType}`);
    }

    if (fileType === TextFileType.BINARY) {
      return;
    }

    const filename = file.originalname?.toLowerCase();
    if (!filename) {
      return;
    }

    if (!extensions.some((extension) => filename.endsWith(extension))) {
      throw new BadRequestException(
        `Only ${extensions.join(', ')} files are supported for ${fileType}`,
      );
    }
  }

  private buildBatchTitle(
    title: string,
    file: { originalname?: string },
    fileCount: number,
  ): string {
    if (fileCount === 1) {
      return title;
    }

    const suffix = file.originalname ? ` - ${file.originalname}` : '';
    return `${title}${suffix}`.slice(0, 150);
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
        content: job.text,
        contentEncoding: ParsedTextContentEncoding.UTF8,
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
      contentEncoding: entity.contentEncoding,
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

function chunkText(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize));
  }

  return chunks;
}
