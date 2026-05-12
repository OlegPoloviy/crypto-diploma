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
import {
  ParsedTextContentEncoding,
  ParsedTextEntity,
  ParsedTextStatus,
} from '../text-parser/parsed-text.entity';
import {
  TextFileType,
  TextParserService,
} from '../text-parser/text-parser.service';
import {
  encryptCaesar,
  encryptVigenereByKeyLengths,
  encryptVigenereByKeySymbols,
} from './classical-ciphers.engine';
import { ClassicalCipherJobEntity } from './classical-cipher-job.entity';
import {
  ClassicalCipherAlgorithm,
  ClassicalCipherJobStatus,
  ClassicalCipherParameters,
  ClassicalCipherWorkerData,
  ClassicalCipherWorkerResult,
} from './classical-ciphers.types';
import { CipherJobResponseDto } from './dto/cipher-job-response.dto';
import { CipherResponseDto } from './dto/cipher-response.dto';

interface QueuedCipherJob {
  id: string;
  text: string;
  algorithm: ClassicalCipherAlgorithm;
  parameters: ClassicalCipherParameters;
}

@Injectable()
export class ClassicalCiphersService {
  private readonly logger = new Logger(ClassicalCiphersService.name);
  private readonly queue: QueuedCipherJob[] = [];
  private readonly deletedJobIds = new Set<string>();
  private currentJobId: string | null = null;
  private currentWorker: Worker | null = null;
  private isProcessing = false;

  constructor(
    @InjectRepository(ParsedTextEntity)
    private readonly parsedTextsRepo: Repository<ParsedTextEntity>,
    @InjectRepository(ClassicalCipherJobEntity)
    private readonly cipherJobsRepo: Repository<ClassicalCipherJobEntity>,
    private readonly textParserService: TextParserService,
  ) {}

  encryptCaesar(text: string, shift: number): CipherResponseDto {
    return encryptCaesar(text, shift);
  }

  encryptVigenereByKeySymbols(text: string, key: string): CipherResponseDto {
    return encryptVigenereByKeySymbols(text, key);
  }

  encryptVigenereByKeyLengths(
    text: string,
    key: string,
    keyLengths = [1, 3, 5, 10, 20],
  ): CipherResponseDto {
    return encryptVigenereByKeyLengths(text, key, keyLengths);
  }

  async createCaesarJob(
    parsedTextId: string,
    shift: number,
    maxSteps?: number,
  ): Promise<CipherJobResponseDto> {
    return this.createJob(parsedTextId, ClassicalCipherAlgorithm.CAESAR, {
      shift,
      maxSteps,
    });
  }

  async createCaesarJobsFromFiles(
    title: string,
    files: { buffer: Buffer; originalname?: string }[] | undefined,
    fileType: TextFileType,
    shift: number,
    maxSteps?: number,
  ): Promise<CipherJobResponseDto[]> {
    const parsedTexts = await this.textParserService.createCompletedFromFiles(
      title,
      files,
      fileType,
    );

    return Promise.all(
      parsedTexts.map((parsedText) =>
        this.createCaesarJob(parsedText.id, shift, maxSteps),
      ),
    );
  }

  async createVigenereKeySymbolsJob(
    parsedTextId: string,
    key: string,
  ): Promise<CipherJobResponseDto> {
    return this.createJob(
      parsedTextId,
      ClassicalCipherAlgorithm.VIGENERE_KEY_SYMBOLS,
      { key },
    );
  }

  async createVigenereKeySymbolsJobsFromFiles(
    title: string,
    files: { buffer: Buffer; originalname?: string }[] | undefined,
    fileType: TextFileType,
    key: string,
  ): Promise<CipherJobResponseDto[]> {
    const parsedTexts = await this.textParserService.createCompletedFromFiles(
      title,
      files,
      fileType,
    );

    return Promise.all(
      parsedTexts.map((parsedText) =>
        this.createVigenereKeySymbolsJob(parsedText.id, key),
      ),
    );
  }

  async createVigenereKeyLengthsJob(
    parsedTextId: string,
    key: string,
    keyLengths?: number[],
  ): Promise<CipherJobResponseDto> {
    return this.createJob(
      parsedTextId,
      ClassicalCipherAlgorithm.VIGENERE_KEY_LENGTHS,
      { key, keyLengths },
    );
  }

  async createVigenereKeyLengthsJobsFromFiles(
    title: string,
    files: { buffer: Buffer; originalname?: string }[] | undefined,
    fileType: TextFileType,
    key: string,
    keyLengths?: number[],
  ): Promise<CipherJobResponseDto[]> {
    const parsedTexts = await this.textParserService.createCompletedFromFiles(
      title,
      files,
      fileType,
    );

    return Promise.all(
      parsedTexts.map((parsedText) =>
        this.createVigenereKeyLengthsJob(parsedText.id, key, keyLengths),
      ),
    );
  }

  async findAllJobs(): Promise<CipherJobResponseDto[]> {
    const jobs = await this.cipherJobsRepo.find({
      order: { createdAt: 'DESC' },
    });

    return jobs.map((job) => this.toJobResponse(job));
  }

  async findOneJob(id: string): Promise<CipherJobResponseDto> {
    const job = await this.cipherJobsRepo.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Classical cipher job ${id} not found`);
    }

    return this.toJobResponse(job);
  }

  async deleteJob(id: string): Promise<void> {
    const queuedIndex = this.queue.findIndex((job) => job.id === id);
    const removedFromQueue = queuedIndex >= 0;
    if (removedFromQueue) {
      this.queue.splice(queuedIndex, 1);
    }

    const isActiveJob = this.currentJobId === id;
    if (isActiveJob) {
      this.deletedJobIds.add(id);
      await this.currentWorker?.terminate();
    }

    const result = await this.cipherJobsRepo.delete(id);
    if (!result.affected && !removedFromQueue && !isActiveJob) {
      throw new NotFoundException(`Classical cipher job ${id} not found`);
    }
  }

  private async createJob(
    parsedTextId: string,
    algorithm: ClassicalCipherAlgorithm,
    parameters: ClassicalCipherParameters,
  ): Promise<CipherJobResponseDto> {
    const parsedText = await this.parsedTextsRepo.findOne({
      where: { id: parsedTextId },
      select: {
        id: true,
        status: true,
        words: true,
        content: true,
        contentEncoding: true,
      },
    });

    if (!parsedText) {
      throw new NotFoundException(`Parsed text ${parsedTextId} not found`);
    }

    if (parsedText.status !== ParsedTextStatus.COMPLETED) {
      throw new BadRequestException(
        `Parsed text ${parsedTextId} is not ready yet: ${parsedText.status}`,
      );
    }

    const text = parsedText.content ?? parsedText.words?.join(' ') ?? '';
    if (!text.trim()) {
      throw new BadRequestException(
        `Parsed text ${parsedTextId} has no content`,
      );
    }

    const jobParameters: ClassicalCipherParameters = {
      ...parameters,
      inputEncoding:
        parsedText.contentEncoding === ParsedTextContentEncoding.HEX
          ? 'hex'
          : 'utf8',
    };

    const job = await this.cipherJobsRepo.save(
      this.cipherJobsRepo.create({
        parsedTextId,
        algorithm,
        parameters: jobParameters,
        status: ClassicalCipherJobStatus.QUEUED,
      }),
    );

    this.enqueue({
      id: job.id,
      text,
      algorithm,
      parameters: jobParameters,
    });

    return this.toJobResponse(job);
  }

  private enqueue(job: QueuedCipherJob): void {
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

  private async processJob(job: QueuedCipherJob): Promise<void> {
    if (this.deletedJobIds.has(job.id)) {
      return;
    }

    await this.cipherJobsRepo.update(job.id, {
      status: ClassicalCipherJobStatus.PROCESSING,
      errorMessage: null,
    });

    try {
      const result = await this.runCipherWorker(
        {
          text: job.text,
          algorithm: job.algorithm,
          parameters: job.parameters,
        },
        job.id,
      );
      if (this.deletedJobIds.has(job.id)) {
        return;
      }

      await this.cipherJobsRepo.update(job.id, {
        finalText: result.finalText,
        steps: result.steps,
        metricStats: result.metricStats,
        status: ClassicalCipherJobStatus.COMPLETED,
      });
    } catch (error) {
      if (this.deletedJobIds.has(job.id)) {
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Failed to run cipher job';
      this.logger.error(
        `Failed to run classical cipher job ${job.id}: ${message}`,
      );

      await this.cipherJobsRepo.update(job.id, {
        status: ClassicalCipherJobStatus.FAILED,
        errorMessage: message,
      });
    } finally {
      this.deletedJobIds.delete(job.id);
    }
  }

  private runCipherWorker(
    data: ClassicalCipherWorkerData,
    jobId: string,
  ): Promise<CipherResponseDto> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        join(__dirname, 'classical-ciphers.worker.js'),
        {
          workerData: data,
        },
      );
      let settled = false;

      this.currentJobId = jobId;
      this.currentWorker = worker;

      const cleanup = (): void => {
        if (this.currentWorker === worker) {
          this.currentWorker = null;
          this.currentJobId = null;
        }
      };

      worker.once('message', (message: ClassicalCipherWorkerResult) => {
        settled = true;
        cleanup();
        if ('error' in message) {
          reject(new Error(message.error));
          return;
        }

        resolve(message);
      });
      worker.once('error', (error) => {
        settled = true;
        cleanup();
        reject(error);
      });
      worker.once('exit', (code) => {
        cleanup();
        if (!settled && code !== 0) {
          reject(new Error(`Cipher worker stopped with exit code ${code}`));
        }
      });
    });
  }

  private toJobResponse(job: ClassicalCipherJobEntity): CipherJobResponseDto {
    return {
      id: job.id,
      parsedTextId: job.parsedTextId,
      algorithm: job.algorithm,
      parameters: job.parameters,
      status: job.status,
      finalText: job.finalText,
      steps: job.steps,
      metricStats: job.metricStats,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
