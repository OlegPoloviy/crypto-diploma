import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import {
  ParsedTextContentEncoding,
  ParsedTextCorpusKind,
  ParsedTextEntity,
  ParsedTextSource,
  ParsedTextStatus,
} from './parsed-text.entity';
import { TextFileType, TextParserService } from './text-parser.service';
import { TextPreprocessMode } from './text-parser.util';

describe('TextParserService', () => {
  let service: TextParserService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    findOne: jest.Mock;
  };
  let idCounter: number;

  beforeEach(() => {
    idCounter = 0;
    repo = {
      create: jest.fn((input) => input as ParsedTextEntity),
      save: jest.fn(async (input) => ({
        id: `parsed-text-${++idCounter}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...input,
      })),
      update: jest.fn(),
      findOne: jest.fn(),
    };
    service = new TextParserService(
      repo as unknown as Repository<ParsedTextEntity>,
    );
    jest
      .spyOn(
        service as unknown as { processQueue: () => Promise<void> },
        'processQueue',
      )
      .mockResolvedValue(undefined);
  });

  it('removes Gutenberg blocks in auto mode and keeps word order', () => {
    const result = service.parse(
      `
      Header that should disappear
      *** START OF THE PROJECT GUTENBERG EBOOK SAMPLE ***
      The quick, brown fox jumps 42 times.
      THE quick fox!
      *** END OF THE PROJECT GUTENBERG EBOOK SAMPLE ***
      License that should disappear
    `,
      TextPreprocessMode.AUTO,
    );

    expect(result).toEqual({
      words: [
        'the',
        'quick',
        'brown',
        'fox',
        'jumps',
        'times',
        'the',
        'quick',
        'fox',
      ],
      totalWords: 9,
      totalChars: 37,
      uniqueWords: 6,
      hurstExponent: expect.any(Number),
      dfaAlpha: expect.any(Number),
      wordFrequencyEntropy: expect.any(Number),
    });
  });

  it('throws when file is missing', async () => {
    await expect(service.createFromFile('Missing file')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when uploaded file does not match the selected type', async () => {
    await expect(
      service.createFromFile('Bad file', {
        originalname: 'book.pdf',
        buffer: Buffer.from('Text'),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('completes small text uploads synchronously', async () => {
    const result = await service.createFromFile(
      'Sample',
      { originalname: 'one.md', buffer: Buffer.from('First text') },
      TextFileType.MARKDOWN,
    );

    expect(result.status).toBe(ParsedTextStatus.COMPLETED);
    expect(result.corpusKind).toBe(ParsedTextCorpusKind.NATURAL_TEXT);
    expect(result.hurstExponent).toEqual(expect.any(Number));
  });

  it('queues one parsing job per large uploaded file', async () => {
    const largeText = 'word '.repeat(200_000);
    const result = await service.createFromFiles(
      'Batch',
      [{ originalname: 'one.md', buffer: Buffer.from(largeText) }],
      TextFileType.MARKDOWN,
    );

    expect(result).toHaveLength(1);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ParsedTextStatus.QUEUED,
      }),
    );
  });

  it('throws when a batch has no files', async () => {
    await expect(service.createFromFiles('Empty batch', [])).rejects.toThrow(
      BadRequestException,
    );
  });

  it('stores binary uploads as completed hex payloads', async () => {
    const allByteValues = Buffer.from(
      Array.from({ length: 256 }, (_, index) => index),
    );
    const result = await service.createFromFiles(
      'Binary batch',
      [{ originalname: 'payload.bin', buffer: allByteValues }],
      TextFileType.BINARY,
    );

    expect(result).toHaveLength(1);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        content: allByteValues.toString('hex'),
        contentEncoding: ParsedTextContentEncoding.HEX,
        corpusKind: ParsedTextCorpusKind.RANDOM_BYTES,
        source: ParsedTextSource.UPLOAD,
        status: ParsedTextStatus.COMPLETED,
        wordFrequencyEntropy: 8,
      }),
    );
  });

  it('generates random bytes baseline with metrics', async () => {
    const result = await service.createRandomBytes({
      title: 'Random 256B',
      byteLength: 256,
      seed: 42,
    });

    expect(result.status).toBe(ParsedTextStatus.COMPLETED);
    expect(result.corpusKind).toBe(ParsedTextCorpusKind.RANDOM_BYTES);
    expect(result.source).toBe(ParsedTextSource.GENERATED);
    expect(result.wordFrequencyEntropy).toEqual(expect.any(Number));
  });

  it('returns stored content for download', async () => {
    repo.findOne.mockResolvedValue({
      id: 'parsed-text-1',
      title: 'Sample book',
      status: ParsedTextStatus.COMPLETED,
      content: 'hello world',
      contentEncoding: ParsedTextContentEncoding.UTF8,
      originalFileName: 'book.txt',
      corpusKind: ParsedTextCorpusKind.NATURAL_TEXT,
    });

    const content = await service.getContent('parsed-text-1');

    expect(content).toEqual({
      filename: 'book.txt',
      contentEncoding: ParsedTextContentEncoding.UTF8,
      content: 'hello world',
      mimeType: 'text/plain; charset=utf-8',
    });
  });

  it('creates linked natural and random baseline pair', async () => {
    const response = await service.createBaselineSetFromText({
      title: 'Baseline sample',
      text: 'Natural language sample for metrics.',
    });

    expect(response.baselineSetId).toEqual(expect.any(String));
    expect(response.natural.corpusKind).toBe(ParsedTextCorpusKind.NATURAL_TEXT);
    expect(response.random.corpusKind).toBe(ParsedTextCorpusKind.RANDOM_BYTES);
    expect(response.natural.baselineSetId).toBe(response.baselineSetId);
    expect(response.random.baselineSetId).toBe(response.baselineSetId);
  });
});
