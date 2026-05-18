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
import { resolveXorWhiteningOptions } from './block-cipher-xor-whitening';
import { decryptAes, formatBytes, parseBytes } from './aes.engine';
import { computeInteractiveEncryptRoundInsights } from './complex-ciphers.engine';
import { decryptDes } from './des.engine';
import { decryptKalyna } from './kalyna.engine';
import { ComplexCipherJobEntity } from './complex-cipher-job.entity';
import { AesDecryptDto, AesEncryptDto } from './dto/aes-cipher.dto';
import { AesResponseDto } from './dto/aes-response.dto';
import { ComplexCipherJobResponseDto } from './dto/complex-cipher-job-response.dto';
import {
  CreateAesCipherJobDto,
  CreateDesCipherJobDto,
  CreateKalynaCipherJobDto,
} from './dto/create-complex-cipher-job.dto';
import { DesDecryptDto, DesEncryptDto } from './dto/des-cipher.dto';
import { DesResponseDto } from './dto/des-response.dto';
import { KalynaDecryptDto, KalynaEncryptDto } from './dto/kalyna-cipher.dto';
import { KalynaResponseDto } from './dto/kalyna-response.dto';
import {
  AesJobParameters,
  AesMode,
  AesOperation,
  BinaryEncoding,
  ComplexCipherAlgorithm,
  ComplexCipherJobStatus,
  ComplexCipherOperation,
  ComplexCipherParameters,
  ComplexCipherWorkerData,
  ComplexCipherWorkerResult,
  ComplexCipherWorkerMessage,
  ComplexCipherWorkerProgress,
  DesJobParameters,
  DesOperation,
  KalynaJobParameters,
  KalynaOperation,
} from './complex-ciphers.types';

interface QueuedComplexCipherJob {
  id: string;
  text: string;
  algorithm: ComplexCipherAlgorithm;
  parameters: ComplexCipherParameters;
}

const COMPLEX_CIPHER_WORKER_TIMEOUT_MS = 900_000;

@Injectable()
export class ComplexCiphersService {
  private readonly logger = new Logger(ComplexCiphersService.name);
  private readonly queue: QueuedComplexCipherJob[] = [];
  private readonly deletedJobIds = new Set<string>();
  private currentJobId: string | null = null;
  private currentWorker: Worker | null = null;
  private isProcessing = false;

  constructor(
    @InjectRepository(ParsedTextEntity)
    private readonly parsedTextsRepo: Repository<ParsedTextEntity>,
    @InjectRepository(ComplexCipherJobEntity)
    private readonly cipherJobsRepo: Repository<ComplexCipherJobEntity>,
    private readonly textParserService: TextParserService,
  ) {}

  encryptAes(body: AesEncryptDto): AesResponseDto {
    const mode = body.mode ?? AesMode.CBC;
    const inputEncoding = body.inputEncoding ?? BinaryEncoding.UTF8;
    const keyEncoding = body.keyEncoding ?? BinaryEncoding.HEX;
    const outputEncoding = body.outputEncoding ?? BinaryEncoding.HEX;
    const ivEncoding = body.ivEncoding ?? BinaryEncoding.HEX;

    const plaintext = parseBytes(body.plaintext, inputEncoding, 'plaintext');
    const key = parseBytes(body.key, keyEncoding, 'key');
    const iv = body.iv ? parseBytes(body.iv, ivEncoding, 'iv') : undefined;
    const insights = computeInteractiveEncryptRoundInsights(
      plaintext,
      key,
      mode,
      iv,
      ComplexCipherAlgorithm.AES,
      outputEncoding,
      body,
    );

    return {
      operation: AesOperation.ENCRYPT,
      mode,
      keySize: key.length * 8,
      outputEncoding,
      result: formatBytes(insights.ciphertext, outputEncoding),
      iv:
        mode === AesMode.CBC && iv
          ? formatBytes(iv, BinaryEncoding.HEX)
          : undefined,
      steps: insights.steps,
      metricStats: insights.metricStats,
      metadata: insights.metadata,
    };
  }

  decryptAes(body: AesDecryptDto): AesResponseDto {
    const mode = body.mode ?? AesMode.CBC;
    const inputEncoding = body.inputEncoding ?? BinaryEncoding.HEX;
    const keyEncoding = body.keyEncoding ?? BinaryEncoding.HEX;
    const outputEncoding = body.outputEncoding ?? BinaryEncoding.UTF8;
    const ivEncoding = body.ivEncoding ?? BinaryEncoding.HEX;

    const ciphertext = parseBytes(body.ciphertext, inputEncoding, 'ciphertext');
    const key = parseBytes(body.key, keyEncoding, 'key');
    const iv = body.iv ? parseBytes(body.iv, ivEncoding, 'iv') : undefined;
    const whitening = resolveXorWhiteningOptions(key, 16, body);
    const result = decryptAes(ciphertext, key, { mode, iv, whitening });

    return {
      operation: AesOperation.DECRYPT,
      mode,
      keySize: key.length * 8,
      outputEncoding,
      result: formatBytes(result.plaintext, outputEncoding),
      iv: result.iv ? formatBytes(result.iv, BinaryEncoding.HEX) : undefined,
    };
  }

  encryptDes(body: DesEncryptDto): DesResponseDto {
    const mode = body.mode ?? AesMode.CBC;
    const inputEncoding = body.inputEncoding ?? BinaryEncoding.UTF8;
    const keyEncoding = body.keyEncoding ?? BinaryEncoding.HEX;
    const outputEncoding = body.outputEncoding ?? BinaryEncoding.HEX;
    const ivEncoding = body.ivEncoding ?? BinaryEncoding.HEX;

    const plaintext = parseBytes(body.plaintext, inputEncoding, 'plaintext');
    const key = parseBytes(body.key, keyEncoding, 'key');
    const iv = body.iv ? parseBytes(body.iv, ivEncoding, 'iv') : undefined;
    const insights = computeInteractiveEncryptRoundInsights(
      plaintext,
      key,
      mode,
      iv,
      ComplexCipherAlgorithm.DES,
      outputEncoding,
      body,
    );

    return {
      operation: DesOperation.ENCRYPT,
      mode,
      keySize: key.length * 8,
      outputEncoding,
      result: formatBytes(insights.ciphertext, outputEncoding),
      iv:
        mode === AesMode.CBC && iv
          ? formatBytes(iv, BinaryEncoding.HEX)
          : undefined,
      steps: insights.steps,
      metricStats: insights.metricStats,
      metadata: insights.metadata,
    };
  }

  async encryptKalyna(body: KalynaEncryptDto): Promise<KalynaResponseDto> {
    const mode = body.mode ?? AesMode.CBC;
    const inputEncoding = body.inputEncoding ?? BinaryEncoding.UTF8;
    const keyEncoding = body.keyEncoding ?? BinaryEncoding.HEX;
    const outputEncoding = body.outputEncoding ?? BinaryEncoding.HEX;
    const ivEncoding = body.ivEncoding ?? BinaryEncoding.HEX;
    const parameters: KalynaJobParameters = {
      key: body.key,
      blockSizeBits: body.blockSizeBits,
      keyEncoding,
      outputEncoding,
      mode,
      iv: body.iv,
      ivEncoding,
      inputEncoding,
    };
    const workerResult = await this.runCipherWorker(
      {
        text: body.plaintext,
        algorithm: ComplexCipherAlgorithm.KALYNA,
        parameters,
      },
      `kalyna-encrypt-${Date.now()}`,
    );
    const key = parseBytes(body.key, keyEncoding, 'key');

    return {
      operation: KalynaOperation.ENCRYPT,
      mode,
      blockSizeBits: body.blockSizeBits,
      keySize: key.length * 8,
      outputEncoding,
      result: workerResult.finalText,
      iv:
        typeof workerResult.metadata?.iv === 'string'
          ? workerResult.metadata.iv
          : undefined,
      steps: workerResult.steps,
      metricStats: workerResult.metricStats,
      metadata: workerResult.metadata,
    };
  }

  decryptKalyna(body: KalynaDecryptDto): KalynaResponseDto {
    const mode = body.mode ?? AesMode.CBC;
    const inputEncoding = body.inputEncoding ?? BinaryEncoding.HEX;
    const keyEncoding = body.keyEncoding ?? BinaryEncoding.HEX;
    const outputEncoding = body.outputEncoding ?? BinaryEncoding.UTF8;
    const ivEncoding = body.ivEncoding ?? BinaryEncoding.HEX;

    const ciphertext = parseBytes(body.ciphertext, inputEncoding, 'ciphertext');
    const key = parseBytes(body.key, keyEncoding, 'key');
    const iv = body.iv ? parseBytes(body.iv, ivEncoding, 'iv') : undefined;
    const result = decryptKalyna(ciphertext, key, {
      blockSizeBits: body.blockSizeBits,
      mode,
      iv,
    });

    return {
      operation: KalynaOperation.DECRYPT,
      mode,
      blockSizeBits: body.blockSizeBits,
      keySize: key.length * 8,
      outputEncoding,
      result: formatBytes(result.plaintext, outputEncoding),
      iv: result.iv ? formatBytes(result.iv, BinaryEncoding.HEX) : undefined,
    };
  }

  decryptDes(body: DesDecryptDto): DesResponseDto {
    const mode = body.mode ?? AesMode.CBC;
    const inputEncoding = body.inputEncoding ?? BinaryEncoding.HEX;
    const keyEncoding = body.keyEncoding ?? BinaryEncoding.HEX;
    const outputEncoding = body.outputEncoding ?? BinaryEncoding.UTF8;
    const ivEncoding = body.ivEncoding ?? BinaryEncoding.HEX;

    const ciphertext = parseBytes(body.ciphertext, inputEncoding, 'ciphertext');
    const key = parseBytes(body.key, keyEncoding, 'key');
    const iv = body.iv ? parseBytes(body.iv, ivEncoding, 'iv') : undefined;
    const whitening = resolveXorWhiteningOptions(key, 8, body);
    const result = decryptDes(ciphertext, key, { mode, iv, whitening });

    return {
      operation: DesOperation.DECRYPT,
      mode,
      keySize: key.length * 8,
      outputEncoding,
      result: formatBytes(result.plaintext, outputEncoding),
      iv: result.iv ? formatBytes(result.iv, BinaryEncoding.HEX) : undefined,
    };
  }

  async createAesJob(
    body: CreateAesCipherJobDto,
  ): Promise<ComplexCipherJobResponseDto> {
    const parameters: AesJobParameters = {
      operation: body.operation,
      key: body.key,
      inputEncoding: body.inputEncoding,
      keyEncoding: body.keyEncoding,
      outputEncoding: body.outputEncoding,
      mode: body.mode,
      iv: body.iv,
      ivEncoding: body.ivEncoding,
      whiteningEnabled: body.whiteningEnabled,
      kPre: body.kPre,
      kPost: body.kPost,
      whiteningKeyEncoding: body.whiteningKeyEncoding,
    };

    return this.createJob(
      body.parsedTextId,
      ComplexCipherAlgorithm.AES,
      parameters,
      body.sourceJobId,
    );
  }

  async createKalynaJob(
    body: CreateKalynaCipherJobDto,
  ): Promise<ComplexCipherJobResponseDto> {
    const parameters: KalynaJobParameters = {
      operation: body.operation,
      key: body.key,
      blockSizeBits: body.blockSizeBits,
      inputEncoding: body.inputEncoding,
      keyEncoding: body.keyEncoding,
      outputEncoding: body.outputEncoding,
      mode: body.mode,
      iv: body.iv,
      ivEncoding: body.ivEncoding,
    };

    return this.createJob(
      body.parsedTextId,
      ComplexCipherAlgorithm.KALYNA,
      parameters,
      body.sourceJobId,
    );
  }

  async createDesJob(
    body: CreateDesCipherJobDto,
  ): Promise<ComplexCipherJobResponseDto> {
    const parameters: DesJobParameters = {
      operation: body.operation,
      key: body.key,
      inputEncoding: body.inputEncoding,
      keyEncoding: body.keyEncoding,
      outputEncoding: body.outputEncoding,
      mode: body.mode,
      iv: body.iv,
      ivEncoding: body.ivEncoding,
      whiteningEnabled: body.whiteningEnabled,
      kPre: body.kPre,
      kPost: body.kPost,
      whiteningKeyEncoding: body.whiteningKeyEncoding,
    };

    return this.createJob(
      body.parsedTextId,
      ComplexCipherAlgorithm.DES,
      parameters,
      body.sourceJobId,
    );
  }

  async createAesJobsFromFiles(
    title: string,
    files: { buffer: Buffer; originalname?: string }[] | undefined,
    fileType: TextFileType,
    body: Omit<CreateAesCipherJobDto, 'parsedTextId'>,
  ): Promise<ComplexCipherJobResponseDto[]> {
    const parsedTexts = await this.textParserService.createCompletedFromFiles(
      title,
      files,
      fileType,
    );

    return Promise.all(
      parsedTexts.map((parsedText) =>
        this.createAesJob({
          parsedTextId: parsedText.id,
          ...body,
        }),
      ),
    );
  }

  async createKalynaJobsFromFiles(
    title: string,
    files: { buffer: Buffer; originalname?: string }[] | undefined,
    fileType: TextFileType,
    body: Omit<CreateKalynaCipherJobDto, 'parsedTextId'>,
  ): Promise<ComplexCipherJobResponseDto[]> {
    const parsedTexts = await this.textParserService.createCompletedFromFiles(
      title,
      files,
      fileType,
    );

    return Promise.all(
      parsedTexts.map((parsedText) =>
        this.createKalynaJob({
          parsedTextId: parsedText.id,
          ...body,
        }),
      ),
    );
  }

  async createDesJobsFromFiles(
    title: string,
    files: { buffer: Buffer; originalname?: string }[] | undefined,
    fileType: TextFileType,
    body: Omit<CreateDesCipherJobDto, 'parsedTextId'>,
  ): Promise<ComplexCipherJobResponseDto[]> {
    const parsedTexts = await this.textParserService.createCompletedFromFiles(
      title,
      files,
      fileType,
    );

    return Promise.all(
      parsedTexts.map((parsedText) =>
        this.createDesJob({
          parsedTextId: parsedText.id,
          ...body,
        }),
      ),
    );
  }

  async findAllJobs(): Promise<ComplexCipherJobResponseDto[]> {
    const jobs = await this.cipherJobsRepo.find({
      order: { createdAt: 'DESC' },
    });

    return jobs.map((job) => this.toJobResponse(job));
  }

  async findOneJob(id: string): Promise<ComplexCipherJobResponseDto> {
    const job = await this.cipherJobsRepo.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Complex cipher job ${id} not found`);
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
      throw new NotFoundException(`Complex cipher job ${id} not found`);
    }
  }

  private async createJob(
    parsedTextId: string,
    algorithm: ComplexCipherAlgorithm,
    parameters: ComplexCipherParameters,
    sourceJobId?: string,
  ): Promise<ComplexCipherJobResponseDto> {
    const operation = parameters.operation ?? ComplexCipherOperation.ENCRYPT;
    const sourceJob =
      operation === ComplexCipherOperation.DECRYPT && sourceJobId
        ? await this.cipherJobsRepo.findOne({ where: { id: sourceJobId } })
        : null;

    if (sourceJobId && !sourceJob) {
      throw new NotFoundException(
        `Complex cipher job ${sourceJobId} not found`,
      );
    }

    if (sourceJob) {
      if (sourceJob.algorithm !== algorithm) {
        throw new BadRequestException(
          `Source job ${sourceJobId} is ${sourceJob.algorithm}, not ${algorithm}`,
        );
      }

      if (
        sourceJob.status !== ComplexCipherJobStatus.COMPLETED ||
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

    const jobParameters = [
      ComplexCipherAlgorithm.AES,
      ComplexCipherAlgorithm.DES,
      ComplexCipherAlgorithm.KALYNA,
    ].includes(algorithm)
      ? {
          ...parameters,
          inputEncoding:
            parameters.inputEncoding ??
            getSourceJobOutputEncoding(sourceJob) ??
            (parsedText.contentEncoding === ParsedTextContentEncoding.HEX
              ? BinaryEncoding.HEX
              : BinaryEncoding.UTF8),
          operation,
        }
      : parameters;

    const job = await this.cipherJobsRepo.save(
      this.cipherJobsRepo.create({
        parsedTextId: parsedText.id,
        algorithm,
        parameters: jobParameters,
        status: ComplexCipherJobStatus.QUEUED,
        progressPercent: 0,
        progressProcessed: 0,
        progressTotal: Math.max(1, text.length),
        progressMessage: 'Queued',
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

  private enqueue(job: QueuedComplexCipherJob): void {
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

  private async processJob(job: QueuedComplexCipherJob): Promise<void> {
    if (this.deletedJobIds.has(job.id)) {
      return;
    }

    await this.cipherJobsRepo.update(job.id, {
      status: ComplexCipherJobStatus.PROCESSING,
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
        metadata: result.metadata,
        metricStats: result.metricStats,
        status: ComplexCipherJobStatus.COMPLETED,
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
        `Failed to run complex cipher job ${job.id}: ${message}`,
      );

      await this.cipherJobsRepo.update(job.id, {
        status: ComplexCipherJobStatus.FAILED,
        errorMessage: message,
        progressMessage: 'Failed',
      });
    } finally {
      this.deletedJobIds.delete(job.id);
    }
  }

  private runCipherWorker(
    data: ComplexCipherWorkerData,
    jobId: string,
  ): Promise<ComplexCipherWorkerResult> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(join(__dirname, 'complex-ciphers.worker.js'), {
        workerData: data,
        resourceLimits: {
          maxOldGenerationSizeMb: 256,
          maxYoungGenerationSizeMb: 64,
        },
      });
      let settled = false;
      let progressWrites: Promise<void> = Promise.resolve();
      const timeout = setTimeout(() => {
        if (settled) {
          return;
        }

        settled = true;
        void worker.terminate();
        cleanup();
        reject(
          new Error(
            `Cipher worker timed out after ${COMPLEX_CIPHER_WORKER_TIMEOUT_MS / 1000}s`,
          ),
        );
      }, COMPLEX_CIPHER_WORKER_TIMEOUT_MS);

      this.currentJobId = jobId;
      this.currentWorker = worker;

      const cleanup = (): void => {
        clearTimeout(timeout);
        if (this.currentWorker === worker) {
          this.currentWorker = null;
          this.currentJobId = null;
        }
      };

      worker.on('message', (message: ComplexCipherWorkerMessage) => {
        if (settled) {
          return;
        }

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
        if (settled) {
          return;
        }

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

  private toJobResponse(
    job: ComplexCipherJobEntity,
  ): ComplexCipherJobResponseDto {
    return {
      id: job.id,
      parsedTextId: job.parsedTextId,
      algorithm: job.algorithm,
      parameters: job.parameters,
      status: job.status,
      finalText: job.finalText,
      steps: job.steps,
      metadata: job.metadata,
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

function getSourceJobOutputEncoding(
  sourceJob: ComplexCipherJobEntity | null,
): BinaryEncoding | undefined {
  const metadataEncoding = sourceJob?.metadata?.outputEncoding;
  if (isBinaryEncoding(metadataEncoding)) {
    return metadataEncoding;
  }

  const parameterEncoding = sourceJob?.parameters.outputEncoding;
  return isBinaryEncoding(parameterEncoding) ? parameterEncoding : undefined;
}

function isBinaryEncoding(value: unknown): value is BinaryEncoding {
  return (
    value === BinaryEncoding.UTF8 ||
    value === BinaryEncoding.HEX ||
    value === BinaryEncoding.BASE64
  );
}

function isWorkerProgress(
  message: ComplexCipherWorkerMessage,
): message is ComplexCipherWorkerProgress {
  return 'type' in message && message.type === 'progress';
}
