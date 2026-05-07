import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ParsedTextEntity } from './parsed-text.entity';
import { TextParserService } from './text-parser.service';

describe('TextParserService', () => {
  let service: TextParserService;
  let repo: Partial<Repository<ParsedTextEntity>>;

  beforeEach(() => {
    repo = {};
    service = new TextParserService(repo as Repository<ParsedTextEntity>);
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

  it('throws when uploaded file is not txt', async () => {
    await expect(
      service.createFromFile('Bad file', {
        originalname: 'book.pdf',
        buffer: Buffer.from('Text'),
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
