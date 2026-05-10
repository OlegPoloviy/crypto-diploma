import { BadRequestException } from '@nestjs/common';
import { ClassicalCiphersService } from './classical-ciphers.service';
import { ParsedTextStatus } from '../text-parser/parsed-text.entity';
import { encryptCaesarCheckpoints } from './classical-ciphers.engine';
import { calculateTextMetrics } from './classical-ciphers.metrics';
import {
  ClassicalCipherAlgorithm,
  ClassicalCipherJobStatus,
} from './classical-ciphers.types';

describe('ClassicalCiphersService', () => {
  let service: ClassicalCiphersService;
  let parsedTextsRepo: {
    findOne: jest.Mock;
  };
  let cipherJobsRepo: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(() => {
    parsedTextsRepo = {
      findOne: jest.fn(),
    };
    cipherJobsRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({
        id: '0f50273c-4181-4496-9648-e84f355cedee',
        createdAt: new Date('2026-05-05T00:00:00.000Z'),
        updatedAt: new Date('2026-05-05T00:00:00.000Z'),
        ...value,
      })),
      update: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    service = new ClassicalCiphersService(
      parsedTextsRepo as never,
      cipherJobsRepo as never,
    );
  });

  it('encrypts Caesar cipher word-by-word and stores intermediate states', () => {
    const result = service.encryptCaesar('hello world', 3);

    expect(result.finalText).toBe('khoor zruog');
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]).toMatchObject({
      step: 1,
      text: 'khoor world',
    });
    expect(result.steps[1]).toMatchObject({
      step: 2,
      text: 'khoor zruog',
    });
    expect(result.steps[0].hurstExponent).toEqual(expect.any(Number));
    expect(result.steps[0].dfaAlpha).toEqual(expect.any(Number));
    expect(result.steps[0].wordFrequencyEntropy).toEqual(expect.any(Number));
    expect(result.metricStats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'hurstExponent',
          mean: expect.any(Number),
          standardDeviation: expect.any(Number),
        }),
      ]),
    );
  });

  it('encrypts Vigenere cipher progressively by key symbols', () => {
    const result = service.encryptVigenereByKeySymbols('hello world', 'KEY');

    expect(result.steps).toHaveLength(3);
    expect(result.steps[0].text).toBe('relvo wyrln');
    expect(result.steps[1].text).toBe('rilvs wyvln');
    expect(result.finalText).toBe('rijvs uyvjn');
    expect(result.steps[1].description).toBe("Applied key symbol 'E' (2 of 3)");
  });

  it('compares Vigenere encryption by configured key lengths', () => {
    const result = service.encryptVigenereByKeyLengths(
      'attack at dawn',
      'KEY',
      [3, 1, 3],
    );

    expect(result.steps.map((step) => step.description)).toEqual([
      'Encrypted with key length 1',
      'Encrypted with key length 3',
    ]);
    expect(result.steps[0].text).toBe('kddkmu kd nkgx');
    expect(result.steps[1].text).toBe('kxrkgi kx bkal');
    expect(result.steps.map((step) => step.keyLength)).toEqual([1, 3]);
  });

  it('limits async Caesar checkpoints for large texts', () => {
    const text = Array.from({ length: 120 }, (_, index) => `word${index}`).join(
      ' ',
    );
    const result = encryptCaesarCheckpoints(text, 3, 5);

    expect(result.steps).toHaveLength(5);
    expect(result.finalText).toContain('zrug0');
    expect(result.steps.at(-1)?.description).toBe('Encrypted 120 of 120 words');
  });

  it('keeps Caesar word-frequency entropy identical to the original text', () => {
    const plainText = 'the quick brown fox jumps over the lazy dog '.repeat(
      200,
    );
    const encryptedText = encryptCaesarCheckpoints(plainText, 3, 1).finalText;
    const plainMetrics = calculateTextMetrics(plainText);
    const encryptedMetrics = calculateTextMetrics(encryptedText);

    expect(encryptedMetrics.wordFrequencyEntropy).toBe(
      plainMetrics.wordFrequencyEntropy,
    );
  });

  it('rejects keys without letters', () => {
    expect(() => service.encryptVigenereByKeySymbols('hello', '123')).toThrow(
      BadRequestException,
    );
  });

  it('queues a Caesar job for completed parsed text and processes it in worker', async () => {
    jest.spyOn(service as never, 'runCipherWorker').mockResolvedValue({
      finalText: 'khoor zruog',
      steps: [],
      metricStats: [],
    } as never);
    parsedTextsRepo.findOne.mockResolvedValue({
      id: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
      status: ParsedTextStatus.COMPLETED,
      words: ['hello', 'world'],
    });

    const result = await service.createCaesarJob(
      '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
      3,
    );

    expect(result).toMatchObject({
      id: '0f50273c-4181-4496-9648-e84f355cedee',
      parsedTextId: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
      algorithm: ClassicalCipherAlgorithm.CAESAR,
      status: ClassicalCipherJobStatus.QUEUED,
      parameters: { shift: 3, maxSteps: undefined },
    });
    expect(cipherJobsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        parsedTextId: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
        algorithm: ClassicalCipherAlgorithm.CAESAR,
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(cipherJobsRepo.update).toHaveBeenCalledWith(
      '0f50273c-4181-4496-9648-e84f355cedee',
      expect.objectContaining({
        status: ClassicalCipherJobStatus.COMPLETED,
        finalText: 'khoor zruog',
        metricStats: [],
      }),
    );
  });

  it('rejects jobs for parsed texts that are still processing', async () => {
    parsedTextsRepo.findOne.mockResolvedValue({
      id: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
      status: ParsedTextStatus.PROCESSING,
      words: ['hello'],
    });

    await expect(
      service.createCaesarJob('5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f', 3),
    ).rejects.toThrow(BadRequestException);
  });
});
