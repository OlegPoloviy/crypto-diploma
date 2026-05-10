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
  ParsedTextEntity,
  ParsedTextStatus,
} from '../text-parser/parsed-text.entity';
import { decryptAes, encryptAes, formatBytes, parseBytes } from './aes.engine';
import { ComplexCipherJobEntity } from './complex-cipher-job.entity';
import { AesDecryptDto, AesEncryptDto } from './dto/aes-cipher.dto';
import { AesResponseDto } from './dto/aes-response.dto';
import { ComplexCipherJobResponseDto } from './dto/complex-cipher-job-response.dto';
import { CreateAesCipherJobDto } from './dto/create-complex-cipher-job.dto';
import {
  AesJobParameters,
  AesMode,
  AesOperation,
  BinaryEncoding,
  ComplexCipherAlgorithm,
  ComplexCipherJobStatus,
  ComplexCipherParameters,
  ComplexCipherWorkerData,
  ComplexCipherWorkerResult,
  ComplexCipherWorkerMessage,
} from './complex-ciphers.types';

interface QueuedComplexCipherJob {
  id: string;
  text: string;
  algorithm: ComplexCipherAlgorithm;
  parameters: ComplexCipherParameters;
}

@Injectable()
export class ComplexCiphersService {
  private readonly logger = new Logger(ComplexCiphersService.name);
  private readonly queue: QueuedComplexCipherJob[] = [];
  private isProcessing = false;

  constructor(
    @InjectRepository(ParsedTextEntity)
    private readonly parsedTextsRepo: Repository<ParsedTextEntity>,
    @InjectRepository(ComplexCipherJobEntity)
    private readonly cipherJobsRepo: Repository<ComplexCipherJobEntity>,
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
    const result = encryptAes(plaintext, key, { mode, iv });

    return {
      operation: AesOperation.ENCRYPT,
      mode,
      keySize: key.length * 8,
      outputEncoding,
      result: formatBytes(result.ciphertext, outputEncoding),
      iv: result.iv ? formatBytes(result.iv, BinaryEncoding.HEX) : undefined,
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
    const result = decryptAes(ciphertext, key, { mode, iv });

    return {
      operation: AesOperation.DECRYPT,
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
      key: body.key,
      keyEncoding: body.keyEncoding,
      outputEncoding: body.outputEncoding,
      mode: body.mode,
      iv: body.iv,
      ivEncoding: body.ivEncoding,
    };

    return this.createJob(
      body.parsedTextId,
      ComplexCipherAlgorithm.AES,
      parameters,
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

  private async createJob(
    parsedTextId: string,
    algorithm: ComplexCipherAlgorithm,
    parameters: ComplexCipherParameters,
  ): Promise<ComplexCipherJobResponseDto> {
    const parsedText = await this.parsedTextsRepo.findOne({
      where: { id: parsedTextId },
      select: {
        id: true,
        status: true,
        words: true,
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

    const text = parsedText.words?.join(' ') ?? '';
    if (!text.trim()) {
      throw new BadRequestException(`Parsed text ${parsedTextId} has no words`);
    }

    const job = await this.cipherJobsRepo.save(
      this.cipherJobsRepo.create({
        parsedTextId,
        algorithm,
        parameters,
        status: ComplexCipherJobStatus.QUEUED,
      }),
    );

    this.enqueue({
      id: job.id,
      text,
      algorithm,
      parameters,
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
    await this.cipherJobsRepo.update(job.id, {
      status: ComplexCipherJobStatus.PROCESSING,
      errorMessage: null,
    });

    try {
      const result = await this.runCipherWorker({
        text: job.text,
        algorithm: job.algorithm,
        parameters: job.parameters,
      });
      await this.cipherJobsRepo.update(job.id, {
        finalText: result.finalText,
        metadata: result.metadata,
        metricStats: result.metricStats,
        status: ComplexCipherJobStatus.COMPLETED,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to run cipher job';
      this.logger.error(
        `Failed to run complex cipher job ${job.id}: ${message}`,
      );

      await this.cipherJobsRepo.update(job.id, {
        status: ComplexCipherJobStatus.FAILED,
        errorMessage: message,
      });
    }
  }

  private runCipherWorker(
    data: ComplexCipherWorkerData,
  ): Promise<ComplexCipherWorkerResult> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(join(__dirname, 'complex-ciphers.worker.js'), {
        workerData: data,
      });

      worker.once('message', (message: ComplexCipherWorkerMessage) => {
        if ('error' in message) {
          reject(new Error(message.error));
          return;
        }

        resolve(message);
      });
      worker.once('error', reject);
      worker.once('exit', (code) => {
        if (code !== 0) {
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
      metadata: job.metadata,
      metricStats: job.metricStats,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
