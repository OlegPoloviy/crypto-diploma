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
  ClassicalCipherOperation,
  ClassicalCipherParameters,
  CipherWorkerProgress,
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

  encryptCaesar(
    text: string,
    shift: number,
    whiteningEnabled?: boolean,
  ): CipherResponseDto {
    return encryptCaesar(text, shift, { enabled: whiteningEnabled === true });
  }

  encryptVigenereByKeySymbols(
    text: string,
    key: string,
    whiteningEnabled?: boolean,
  ): CipherResponseDto {
    return encryptVigenereByKeySymbols(text, key, {
      enabled: whiteningEnabled === true,
    });
  }

  encryptVigenereByKeyLengths(
    text: string,
    key: string,
    keyLengths = [1, 3, 5, 10, 20],
    whiteningEnabled?: boolean,
  ): CipherResponseDto {
    return encryptVigenereByKeyLengths(text, key, keyLengths, {
      enabled: whiteningEnabled === true,
    });
  }

  async createCaesarJob(
    parsedTextId: string,
    shift: number,
    maxSteps?: number,
    whiteningEnabled?: boolean,
    operation?: ClassicalCipherOperation,
    sourceJobId?: string,
  ): Promise<CipherJobResponseDto> {
    return this.createJob(
      parsedTextId,
      ClassicalCipherAlgorithm.CAESAR,
      {
        operation,
        shift,
        maxSteps,
        whiteningEnabled,
      },
      sourceJobId,
    );
  }

  async createCaesarJobsFromFiles(
    title: string,
    files: { buffer: Buffer; originalname?: string }[] | undefined,
    fileType: TextFileType,
    shift: number,
    maxSteps?: number,
    whiteningEnabled?: boolean,
    operation?: ClassicalCipherOperation,
  ): Promise<CipherJobResponseDto[]> {
    const parsedTexts = await this.textParserService.createCompletedFromFiles(
      title,
      files,
      fileType,
    );

    return Promise.all(
      parsedTexts.map((parsedText) =>
        this.createCaesarJob(
          parsedText.id,
          shift,
          maxSteps,
          whiteningEnabled,
          operation,
        ),
      ),
    );
  }

  async createVigenereKeySymbolsJob(
    parsedTextId: string,
    key: string,
    whiteningEnabled?: boolean,
    operation?: ClassicalCipherOperation,
    sourceJobId?: string,
  ): Promise<CipherJobResponseDto> {
    return this.createJob(
      parsedTextId,
      ClassicalCipherAlgorithm.VIGENERE_KEY_SYMBOLS,
      { operation, key, whiteningEnabled },
      sourceJobId,
    );
  }

  async createVigenereKeySymbolsJobsFromFiles(
    title: string,
    files: { buffer: Buffer; originalname?: string }[] | undefined,
    fileType: TextFileType,
    key: string,
    whiteningEnabled?: boolean,
    operation?: ClassicalCipherOperation,
  ): Promise<CipherJobResponseDto[]> {
    const parsedTexts = await this.textParserService.createCompletedFromFiles(
      title,
      files,
      fileType,
    );

    return Promise.all(
      parsedTexts.map((parsedText) =>
        this.createVigenereKeySymbolsJob(
          parsedText.id,
          key,
          whiteningEnabled,
          operation,
        ),
      ),
    );
  }

  async createVigenereKeyLengthsJob(
    parsedTextId: string,
    key: string,
    keyLengths?: number[],
    whiteningEnabled?: boolean,
    operation?: ClassicalCipherOperation,
    sourceJobId?: string,
  ): Promise<CipherJobResponseDto> {
    return this.createJob(
      parsedTextId,
      ClassicalCipherAlgorithm.VIGENERE_KEY_LENGTHS,
      { operation, key, keyLengths, whiteningEnabled },
      sourceJobId,
    );
  }

  async createVigenereKeyLengthsJobsFromFiles(
    title: string,
    files: { buffer: Buffer; originalname?: string }[] | undefined,
    fileType: TextFileType,
    key: string,
    keyLengths?: number[],
    whiteningEnabled?: boolean,
    operation?: ClassicalCipherOperation,
  ): Promise<CipherJobResponseDto[]> {
    const parsedTexts = await this.textParserService.createCompletedFromFiles(
      title,
      files,
      fileType,
    );

    return Promise.all(
      parsedTexts.map((parsedText) =>
        this.createVigenereKeyLengthsJob(
          parsedText.id,
          key,
          keyLengths,
          whiteningEnabled,
          operation,
        ),
      ),
    );
  }

  async findAllJobs(): Promise<CipherJobResponseDto[]> {
    const jobs = await this.cipherJobsRepo
      .createQueryBuilder('job')
      .leftJoin('job.parsedText', 'parsedText')
      .addSelect(['parsedText.id', 'parsedText.title'])
      .orderBy('job.createdAt', 'DESC')
      .getMany();

    return jobs.map((job) => this.toJobResponse(job));
  }

  async findOneJob(id: string): Promise<CipherJobResponseDto> {
    const job = await this.cipherJobsRepo
      .createQueryBuilder('job')
      .leftJoin('job.parsedText', 'parsedText')
      .addSelect(['parsedText.id', 'parsedText.title'])
      .where('job.id = :id', { id })
      .getOne();
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
    sourceJobId?: string,
  ): Promise<CipherJobResponseDto> {
    const operation = parameters.operation ?? ClassicalCipherOperation.ENCRYPT;
    const sourceJob =
      operation === ClassicalCipherOperation.DECRYPT && sourceJobId
        ? await this.cipherJobsRepo.findOne({ where: { id: sourceJobId } })
        : null;

    if (sourceJobId && !sourceJob) {
      throw new NotFoundException(
        `Classical cipher job ${sourceJobId} not found`,
      );
    }

    if (sourceJob) {
      if (sourceJob.algorithm !== algorithm) {
        throw new BadRequestException(
          `Source job ${sourceJobId} is ${sourceJob.algorithm}, not ${algorithm}`,
        );
      }

      if (
        sourceJob.status !== ClassicalCipherJobStatus.COMPLETED ||
        !sourceJob.finalText
      ) {
        throw new BadRequestException(
          `Source job ${sourceJobId} has no completed ciphertext`,
        );
      }
    }

    const parsedText = await this.parsedTextsRepo.findOne({
      where: { id: sourceJob?.parsedTextId ?? parsedTextId },
      select: {
        id: true,
        status: true,
        words: true,
        content: true,
        contentEncoding: true,
      },
    });

    if (!parsedText) {
      throw new NotFoundException(
        `Parsed text ${sourceJob?.parsedTextId ?? parsedTextId} not found`,
      );
    }

    if (parsedText.status !== ParsedTextStatus.COMPLETED) {
      throw new BadRequestException(
        `Parsed text ${parsedTextId} is not ready yet: ${parsedText.status}`,
      );
    }

    const text =
      sourceJob?.finalText ??
      parsedText.content ??
      parsedText.words?.join(' ') ??
      '';
    if (!text.trim()) {
      throw new BadRequestException(
        `Parsed text ${parsedTextId} has no content`,
      );
    }

    const jobParameters: ClassicalCipherParameters = {
      ...parameters,
      operation,
      inputEncoding:
        getSourceJobOutputEncoding(sourceJob) ??
        (parsedText.contentEncoding === ParsedTextContentEncoding.HEX
          ? 'hex'
          : 'utf8'),
    };

    const job = await this.cipherJobsRepo.save(
      this.cipherJobsRepo.create({
        parsedTextId: parsedText.id,
        algorithm,
        parameters: jobParameters,
        status: ClassicalCipherJobStatus.QUEUED,
        progressPercent: 0,
        progressProcessed: 0,
        progressTotal: Math.max(1, text.length),
        progressMessage: 'Queued',
      }),
    );
    job.parsedText = parsedText;

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
      progressPercent: 1,
      progressProcessed: 0,
      progressTotal: Math.max(1, job.text.length),
      progressMessage: 'Worker started',
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
        progressPercent: 100,
        progressProcessed: Math.max(1, job.text.length),
        progressTotal: Math.max(1, job.text.length),
        progressMessage: 'Completed',
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
        progressMessage: 'Failed',
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
      let progressWrites: Promise<void> = Promise.resolve();

      this.currentJobId = jobId;
      this.currentWorker = worker;

      const cleanup = (): void => {
        if (this.currentWorker === worker) {
          this.currentWorker = null;
          this.currentJobId = null;
        }
      };

      worker.on('message', (message: ClassicalCipherWorkerResult) => {
        if (isWorkerProgress(message)) {
          progressWrites = progressWrites
            .then(() =>
              this.cipherJobsRepo.update(jobId, {
                progressPercent: message.percent,
                progressProcessed: message.processed,
                progressTotal: message.total,
                progressMessage: message.message,
              }),
            )
            .then(
              () => undefined,
              () => undefined,
            );
          return;
        }

        if (settled) {
          return;
        }

        settled = true;
        void progressWrites.finally(() => {
          cleanup();
          if ('error' in message) {
            reject(new Error(message.error));
            return;
          }

          resolve(message);
        });
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
      parsedTextTitle: job.parsedText?.title ?? null,
      algorithm: job.algorithm,
      parameters: job.parameters,
      status: job.status,
      finalText: job.finalText,
      steps: job.steps,
      metricStats: job.metricStats,
      progressPercent: job.progressPercent ?? 0,
      progressProcessed: job.progressProcessed ?? 0,
      progressTotal: job.progressTotal ?? 0,
      progressMessage: job.progressMessage,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}

function isWorkerProgress(
  message: ClassicalCipherWorkerResult,
): message is CipherWorkerProgress {
  return 'type' in message && message.type === 'progress';
}

function getSourceJobOutputEncoding(
  sourceJob: ClassicalCipherJobEntity | null,
): 'utf8' | 'hex' | undefined {
  if (!sourceJob) {
    return undefined;
  }

  const inputEncoding = sourceJob.parameters.inputEncoding;
  if (
    inputEncoding === 'hex' ||
    sourceJob.parameters.whiteningEnabled === true
  ) {
    return 'hex';
  }

  return 'utf8';
}
