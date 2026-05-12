import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import {
  ParsedTextContentEncoding,
  ParsedTextEntity,
  ParsedTextStatus,
} from './parsed-text.entity';
import { TextFileType, TextParserService } from './text-parser.service';

describe('TextParserService', () => {
  let service: TextParserService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let idCounter: number;

  beforeEach(() => {
    idCounter = 0;
    repo = {
      create: jest.fn((input) => input as ParsedTextEntity),
      save: jest.fn(async (input) => ({
        id: `parsed-text-${++idCounter}`,
        ...input,
      })),
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

  it('removes Gutenberg blocks and keeps word order', () => {
    const result = service.parse(`
      Header that should disappear
      *** START OF THE PROJECT GUTENBERG EBOOK SAMPLE ***
      The quick, brown fox jumps 42 times.
      THE quick fox!
      *** END OF THE PROJECT GUTENBERG EBOOK SAMPLE ***
      License that should disappear
    `);

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

  it('queues one parsing job per uploaded file', async () => {
    const result = await service.createFromFiles(
      'Batch',
      [
        { originalname: 'one.md', buffer: Buffer.from('First text') },
        { originalname: 'two.md', buffer: Buffer.from('Second text') },
      ],
      TextFileType.MARKDOWN,
    );

    expect(result).toHaveLength(2);
    expect(repo.save).toHaveBeenCalledTimes(2);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Batch - one.md',
        originalFileName: 'one.md',
        status: ParsedTextStatus.QUEUED,
      }),
    );
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Batch - two.md',
        originalFileName: 'two.md',
        status: ParsedTextStatus.QUEUED,
      }),
    );
  });

  it('throws when a batch has no files', async () => {
    await expect(service.createFromFiles('Empty batch', [])).rejects.toThrow(
      BadRequestException,
    );
  });

  it('does not create partial jobs when a batch contains an invalid file', async () => {
    await expect(
      service.createFromFiles(
        'Mixed batch',
        [
          { originalname: 'one.md', buffer: Buffer.from('First text') },
          { originalname: 'two.pdf', buffer: Buffer.from('Second text') },
        ],
        TextFileType.MARKDOWN,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(repo.save).not.toHaveBeenCalled();
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
        originalFileName: 'payload.bin',
        status: ParsedTextStatus.COMPLETED,
        wordFrequencyEntropy: 8,
      }),
    );
  });
});
