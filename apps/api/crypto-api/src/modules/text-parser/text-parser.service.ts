import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, randomUUID } from 'crypto';
import { join } from 'path';
import { Worker } from 'worker_threads';
import { FindOptionsWhere, Repository } from 'typeorm';
import { calculateByteMetrics } from '../classical-ciphers/classical-ciphers.metrics';
import { BaselineSetResponseDto } from './dto/baseline-set-response.dto';
import { BaselineSetTextDto } from './dto/baseline-set-text.dto';
import { CreateParsedTextResponseDto } from './dto/create-parsed-text-response.dto';
import { GenerateRandomBytesDto } from './dto/generate-random.dto';
import { ParsedTextContentResponseDto } from './dto/parsed-text-content-response.dto';
import { ParsedTextResponseDto } from './dto/parsed-text-response.dto';
import {
  ParsedTextContentEncoding,
  ParsedTextCorpusKind,
  ParsedTextEntity,
  ParsedTextSource,
  ParsedTextStatus,
} from './parsed-text.entity';
import {
  ParsedTextResult,
  parsePlainText,
  preprocessRawText,
  TextPreprocessMode,
} from './text-parser.util';

interface QueuedParseJob {
  id: string;
  text: string;
  preprocess: TextPreprocessMode;
}

interface PreparedUpload {
  file: { buffer: Buffer; originalname?: string };
  text: string;
  encoding: ParsedTextContentEncoding;
  words?: string[];
}

export interface ListParsedTextsQuery {
  corpusKind?: ParsedTextCorpusKind;
  baselineSetId?: string;
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

const SYNC_PARSE_BYTE_THRESHOLD = 512 * 1024;
const HEX_CHUNK_SIZE = 64;

@Injectable()
export class TextParserService {
  private readonly logger = new Logger(TextParserService.name);
  private readonly queue: QueuedParseJob[] = [];
  private isProcessing = false;

  constructor(
    @InjectRepository(ParsedTextEntity)
    private readonly parsedTextsRepo: Repository<ParsedTextEntity>,
  ) {}

  parse(
    rawText: string,
    preprocess: TextPreprocessMode = TextPreprocessMode.AUTO,
  ): ParsedTextResponseDto {
    if (!rawText?.trim()) {
      throw new BadRequestException('Text cannot be empty');
    }

    return parsePlainText(rawText, { preprocess });
  }

  async createFromText(
    title: string,
    text: string,
    originalFileName?: string,
    preprocess: TextPreprocessMode = TextPreprocessMode.AUTO,
    baselineSetId?: string,
  ): Promise<CreateParsedTextResponseDto> {
    if (!text?.trim()) {
      throw new BadRequestException('Text cannot be empty');
    }

    if (this.shouldQueueText(text)) {
      const parsedText = await this.parsedTextsRepo.save(
        this.parsedTextsRepo.create({
          title,
          source: ParsedTextSource.MANUAL,
          corpusKind: ParsedTextCorpusKind.NATURAL_TEXT,
          baselineSetId: baselineSetId ?? null,
          originalFileName,
          content: text,
          contentEncoding: ParsedTextContentEncoding.UTF8,
          status: ParsedTextStatus.QUEUED,
        }),
      );

      this.enqueue({ id: parsedText.id, text, preprocess });

      return this.toResponse(parsedText);
    }

    return this.createCompletedNaturalText({
      title,
      text,
      source: ParsedTextSource.MANUAL,
      originalFileName,
      preprocess,
      baselineSetId,
    });
  }

  async createRandomBytes(
    body: GenerateRandomBytesDto,
  ): Promise<CreateParsedTextResponseDto> {
    const bytes = generateRandomBuffer(body.byteLength, body.seed);

    return this.saveRandomBytesRecord({
      title: body.title,
      bytes,
      baselineSetId: body.baselineSetId,
    });
  }

  async createBaselineSetFromText(
    body: BaselineSetTextDto,
  ): Promise<BaselineSetResponseDto> {
    const preprocess = body.preprocess ?? TextPreprocessMode.AUTO;
    const baselineSetId = randomUUID();
    const natural = await this.createFromText(
      body.title,
      body.text,
      body.originalFileName,
      preprocess,
      baselineSetId,
    );

    const preprocessed = preprocessNaturalContent(body.text, preprocess);
    const randomByteLength =
      body.randomByteLength ?? Buffer.byteLength(preprocessed, 'utf8');

    const random = await this.createRandomBytes({
      title: `${body.title} (random)`,
      byteLength: randomByteLength,
      baselineSetId,
      seed: body.seed,
    });

    return { baselineSetId, natural, random };
  }

  async createFromFile(
    title: string,
    file?: { buffer: Buffer; originalname?: string },
    fileType = TextFileType.PLAIN_TEXT,
    preprocess: TextPreprocessMode = TextPreprocessMode.AUTO,
    baselineSetId?: string,
  ): Promise<CreateParsedTextResponseDto> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.createUploadJob(
      title,
      this.prepareUpload(file, fileType),
      preprocess,
      baselineSetId,
    );
  }

  async createFromFiles(
    title: string,
    files?: { buffer: Buffer; originalname?: string }[],
    fileType = TextFileType.PLAIN_TEXT,
    preprocess: TextPreprocessMode = TextPreprocessMode.AUTO,
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
          preprocess,
        ),
      ),
    );
  }

  async createCompletedFromFiles(
    title: string,
    files?: { buffer: Buffer; originalname?: string }[],
    fileType = TextFileType.PLAIN_TEXT,
    preprocess: TextPreprocessMode = TextPreprocessMode.AUTO,
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
          preprocess,
        ),
      ),
    );
  }

  async findAll(
    query: ListParsedTextsQuery = {},
  ): Promise<CreateParsedTextResponseDto[]> {
    const where: FindOptionsWhere<ParsedTextEntity> = {};

    if (query.corpusKind) {
      where.corpusKind = query.corpusKind;
    }

    if (query.baselineSetId) {
      where.baselineSetId = query.baselineSetId;
    }

    const rows = await this.parsedTextsRepo.find({
      where,
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        title: true,
        source: true,
        corpusKind: true,
        baselineSetId: true,
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
        corpusKind: true,
        baselineSetId: true,
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

  async getContent(id: string): Promise<ParsedTextContentResponseDto> {
    const parsedText = await this.parsedTextsRepo.findOne({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        content: true,
        contentEncoding: true,
        originalFileName: true,
        corpusKind: true,
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

    const storedContent = parsedText.content?.trim();
    if (!storedContent) {
      throw new BadRequestException(
        `Parsed text ${id} has no stored content to download`,
      );
    }

    const isHex = parsedText.contentEncoding === ParsedTextContentEncoding.HEX;

    return {
      filename: buildDownloadFilename(parsedText),
      contentEncoding: parsedText.contentEncoding,
      content: storedContent,
      mimeType: isHex ? 'application/octet-stream' : 'text/plain; charset=utf-8',
    };
  }

  private async createCompletedNaturalText(input: {
    title: string;
    text: string;
    source: ParsedTextSource;
    originalFileName?: string;
    preprocess: TextPreprocessMode;
    baselineSetId?: string;
  }): Promise<CreateParsedTextResponseDto> {
    const metrics = parsePlainText(input.text, {
      preprocess: input.preprocess,
    });
    const preprocessed = preprocessNaturalContent(input.text, input.preprocess);

    const parsedText = await this.parsedTextsRepo.save(
      this.parsedTextsRepo.create({
        title: input.title,
        source: input.source,
        corpusKind: ParsedTextCorpusKind.NATURAL_TEXT,
        baselineSetId: input.baselineSetId ?? null,
        originalFileName: input.originalFileName,
        content: preprocessed,
        contentEncoding: ParsedTextContentEncoding.UTF8,
        status: ParsedTextStatus.COMPLETED,
        words: metrics.words,
        totalWords: metrics.totalWords,
        totalChars: metrics.totalChars,
        uniqueWords: metrics.uniqueWords,
        hurstExponent: metrics.hurstExponent,
        dfaAlpha: metrics.dfaAlpha,
        wordFrequencyEntropy: metrics.wordFrequencyEntropy,
      }),
    );

    return this.toResponse(parsedText);
  }

  private async saveRandomBytesRecord(input: {
    title: string;
    bytes: Buffer;
    baselineSetId?: string;
    source?: ParsedTextSource;
    originalFileName?: string;
  }): Promise<CreateParsedTextResponseDto> {
    const hex = input.bytes.toString('hex');
    const metrics = calculateByteMetrics(input.bytes);
    const words = chunkText(hex, HEX_CHUNK_SIZE);

    const parsedText = await this.parsedTextsRepo.save(
      this.parsedTextsRepo.create({
        title: input.title,
        source: input.source ?? ParsedTextSource.GENERATED,
        corpusKind: ParsedTextCorpusKind.RANDOM_BYTES,
        originalFileName: input.originalFileName,
        baselineSetId: input.baselineSetId ?? null,
        content: hex,
        contentEncoding: ParsedTextContentEncoding.HEX,
        status: ParsedTextStatus.COMPLETED,
        words,
        totalWords: words.length,
        totalChars: input.bytes.length,
        uniqueWords: new Set(words).size,
        hurstExponent: metrics.hurstExponent,
        dfaAlpha: metrics.dfaAlpha,
        wordFrequencyEntropy: metrics.wordFrequencyEntropy,
      }),
    );

    return this.toResponse(parsedText);
  }

  private enqueue(job: QueuedParseJob): void {
    this.queue.push(job);
    void this.processQueue();
  }

  private shouldQueueText(text: string): boolean {
    return Buffer.byteLength(text, 'utf8') > SYNC_PARSE_BYTE_THRESHOLD;
  }

  private async createUploadJob(
    title: string,
    upload: PreparedUpload,
    preprocess: TextPreprocessMode,
    baselineSetId?: string,
  ): Promise<CreateParsedTextResponseDto> {
    if (upload.encoding === ParsedTextContentEncoding.HEX) {
      return this.createCompletedUpload(title, upload, preprocess);
    }

    if (this.shouldQueueText(upload.text)) {
      const parsedText = await this.parsedTextsRepo.save(
        this.parsedTextsRepo.create({
          title,
          source: ParsedTextSource.UPLOAD,
          corpusKind: ParsedTextCorpusKind.NATURAL_TEXT,
          baselineSetId: baselineSetId ?? null,
          originalFileName: upload.file.originalname,
          content: upload.text,
          contentEncoding: upload.encoding,
          status: ParsedTextStatus.QUEUED,
        }),
      );

      this.enqueue({ id: parsedText.id, text: upload.text, preprocess });

      return this.toResponse(parsedText);
    }

    return this.createCompletedNaturalText({
      title,
      text: upload.text,
      source: ParsedTextSource.UPLOAD,
      originalFileName: upload.file.originalname,
      preprocess,
      baselineSetId,
    });
  }

  private async createCompletedUpload(
    title: string,
    upload: PreparedUpload,
    preprocess: TextPreprocessMode = TextPreprocessMode.AUTO,
  ): Promise<CreateParsedTextResponseDto> {
    if (upload.encoding === ParsedTextContentEncoding.HEX) {
      const bytes = Buffer.from(upload.text, 'hex');
      return this.saveRandomBytesRecord({
        title,
        bytes,
        source: ParsedTextSource.UPLOAD,
        originalFileName: upload.file.originalname,
      });
    }

    const metrics = parsePlainText(upload.text, { preprocess });
    const preprocessed = preprocessNaturalContent(upload.text, preprocess);
    const parsedText = await this.parsedTextsRepo.save(
      this.parsedTextsRepo.create({
        title,
        source: ParsedTextSource.UPLOAD,
        corpusKind: ParsedTextCorpusKind.NATURAL_TEXT,
        originalFileName: upload.file.originalname,
        content: preprocessed,
        contentEncoding: upload.encoding,
        status: ParsedTextStatus.COMPLETED,
        words: metrics.words,
        totalWords: metrics.totalWords,
        totalChars: metrics.totalChars,
        uniqueWords: metrics.uniqueWords,
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
      words: isBinary ? chunkText(text, HEX_CHUNK_SIZE) : undefined,
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
      const result = await this.runParserWorker(job.text, job.preprocess);
      const preprocessed = preprocessNaturalContent(job.text, job.preprocess);
      await this.parsedTextsRepo.update(job.id, {
        content: preprocessed,
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

  private runParserWorker(
    text: string,
    preprocess: TextPreprocessMode,
  ): Promise<ParsedTextResult> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(join(__dirname, 'text-parser.worker.js'), {
        workerData: { text, preprocess },
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
      corpusKind: entity.corpusKind,
      baselineSetId: entity.baselineSetId,
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

function preprocessNaturalContent(
  text: string,
  preprocess: TextPreprocessMode,
): string {
  return preprocessRawText(text, preprocess);
}

function chunkText(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize));
  }

  return chunks;
}

function buildDownloadFilename(parsedText: {
  title: string;
  originalFileName?: string;
  contentEncoding: ParsedTextContentEncoding;
  corpusKind: ParsedTextCorpusKind;
}): string {
  if (parsedText.originalFileName?.trim()) {
    return sanitizeFilename(parsedText.originalFileName);
  }

  const slug = parsedText.title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  const base = slug || 'corpus';

  if (parsedText.contentEncoding === ParsedTextContentEncoding.HEX) {
    return `${base}.bin`;
  }

  return `${base}.txt`;
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').slice(0, 150);
}

function generateRandomBuffer(byteLength: number, seed?: number): Buffer {
  if (seed === undefined) {
    return randomBytes(byteLength);
  }

  const buffer = Buffer.alloc(byteLength);
  let state = seed >>> 0;

  for (let index = 0; index < byteLength; index += 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    buffer[index] = state & 0xff;
  }

  return buffer;
}
