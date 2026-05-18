import { BadRequestException } from '@nestjs/common';
import { ClassicalCiphersService } from './classical-ciphers.service';
import {
  ParsedTextContentEncoding,
  ParsedTextStatus,
} from '../text-parser/parsed-text.entity';
import {
  encryptCaesarCheckpoints,
  runClassicalCipher,
} from './classical-ciphers.engine';
import { calculateTextMetrics } from './classical-ciphers.metrics';
import {
  ClassicalCipherAlgorithm,
  ClassicalCipherJobStatus,
  ClassicalCipherOperation,
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
    delete: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let textParserService: {
    createCompletedFromFiles: jest.Mock;
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
      delete: jest.fn(async () => ({ affected: 1 })),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    textParserService = {
      createCompletedFromFiles: jest.fn(),
    };

    service = new ClassicalCiphersService(
      parsedTextsRepo as never,
      cipherJobsRepo as never,
      textParserService as never,
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
    expect(result.steps[0].deaDelta).toEqual(expect.any(Number));
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

  it('applies optional whitening around Caesar encryption', () => {
    const plain = service.encryptCaesar('hello world', 3);
    const whitened = service.encryptCaesar('hello world', 3, true);

    expect(plain.finalText).toBe('khoor zruog');
    expect(whitened.finalText).not.toBe(plain.finalText);
    expect(whitened.finalText).toMatch(/^[\da-f]+$/);
    expect(whitened.steps.at(-1)?.description).toBe(
      'Classical byte post-whitening',
    );
    expect(whitened.steps.at(-1)?.wordHurstExponent).toEqual(
      expect.any(Number),
    );
    expect(whitened.steps.at(-1)?.byteHurstExponent).toEqual(
      expect.any(Number),
    );
    expect(whitened.finalText).not.toContain('\u0000');
  });

  it('tracks word-level and byte-level Hurst separately for Caesar variants', () => {
    const text = 'the quick brown fox jumps over the lazy dog '.repeat(20);
    const caesar = service.encryptCaesar(text, 3);
    const whitened = service.encryptCaesar(text, 3, true);
    const caesarFinal = caesar.steps.at(-1);
    const whitenedFinal = whitened.steps.at(-1);

    expect(caesarFinal?.wordHurstExponent).toBe(
      whitenedFinal?.wordHurstExponent,
    );
    expect(caesarFinal?.byteHurstExponent).toEqual(expect.any(Number));
    expect(whitenedFinal?.byteHurstExponent).toEqual(expect.any(Number));
    expect(whitenedFinal?.byteDeaDelta).toEqual(expect.any(Number));
    expect(caesarFinal?.hurstExponent).toBe(caesarFinal?.wordHurstExponent);
    expect(whitenedFinal?.byteEntropy ?? 0).toBeGreaterThan(
      caesarFinal?.byteEntropy ?? 0,
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

  it('applies optional whitening around Vigenere key-symbol encryption', () => {
    const plain = service.encryptVigenereByKeySymbols('hello world', 'KEY');
    const whitened = service.encryptVigenereByKeySymbols(
      'hello world',
      'KEY',
      true,
    );

    expect(whitened.finalText).not.toBe(plain.finalText);
    expect(whitened.steps).toHaveLength(4);
    expect(whitened.steps.at(-1)?.description).toBe(
      'Classical byte post-whitening',
    );
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

  it('applies optional whitening around Vigenere key-length encryption', () => {
    const plain = service.encryptVigenereByKeyLengths(
      'attack at dawn',
      'KEY',
      [1, 3],
    );
    const whitened = service.encryptVigenereByKeyLengths(
      'attack at dawn',
      'KEY',
      [1, 3],
      true,
    );

    expect(whitened.finalText).not.toBe(plain.finalText);
    expect(whitened.steps.at(-1)?.description).toBe(
      'Encrypted with key length 3',
    );
    expect(whitened.steps.map((step) => step.keyLength)).toEqual([1, 3]);
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

  it('calculates byte entropy for binary classical cipher payloads', () => {
    const bytes = Buffer.from(Array.from({ length: 256 }, (_, index) => index));
    const result = runClassicalCipher(
      bytes.toString('hex'),
      ClassicalCipherAlgorithm.CAESAR,
      { shift: 0, maxSteps: 1, inputEncoding: 'hex' },
    );

    expect(result.finalText).toBe(bytes.toString('hex'));
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].deaDelta).toEqual(expect.any(Number));
    expect(result.steps[0].wordFrequencyEntropy).toBe(8);
    expect(result.metricStats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'wordFrequencyEntropy',
          final: 8,
          mean: 8,
        }),
      ]),
    );
  });

  it('keeps full binary Vigenere output as raw hex for download decoding', () => {
    const bytes = Buffer.from(
      Array.from({ length: 5000 }, (_, index) => index % 256),
    );
    const key = 'abc';
    const result = runClassicalCipher(
      bytes.toString('hex'),
      ClassicalCipherAlgorithm.VIGENERE_KEY_SYMBOLS,
      { key, inputEncoding: 'hex' },
    );
    const keyBytes = Buffer.from(key);
    const expected = Buffer.from(
      bytes.map(
        (byte, index) => (byte + keyBytes[index % keyBytes.length]) % 256,
      ),
    ).toString('hex');

    expect(result.finalText).toBe(expected);
  });

  it('applies optional whitening to binary classical ciphers', () => {
    const bytes = Buffer.from([0, 1, 2, 3]);
    const plain = runClassicalCipher(
      bytes.toString('hex'),
      ClassicalCipherAlgorithm.CAESAR,
      {
        shift: 1,
        maxSteps: 1,
        inputEncoding: 'hex',
      },
    );
    const whitened = runClassicalCipher(
      bytes.toString('hex'),
      ClassicalCipherAlgorithm.CAESAR,
      {
        shift: 1,
        maxSteps: 1,
        inputEncoding: 'hex',
        whiteningEnabled: true,
      },
    );

    expect(plain.finalText).toBe('01020304');
    expect(whitened.finalText).not.toBe(plain.finalText);
    expect(whitened.steps[0].description).toBe('Classical pre-whitening');
    expect(whitened.steps.at(-1)?.description).toBe('Classical post-whitening');
  });

  it('decrypts classical Caesar ciphertext instead of encrypting it again', () => {
    const encrypted = runClassicalCipher(
      'hello world',
      ClassicalCipherAlgorithm.CAESAR,
      { shift: 3 },
    );
    const decrypted = runClassicalCipher(
      encrypted.finalText,
      ClassicalCipherAlgorithm.CAESAR,
      {
        operation: ClassicalCipherOperation.DECRYPT,
        shift: 3,
      },
    );

    expect(encrypted.finalText).toBe('khoor zruog');
    expect(decrypted.finalText).toBe('hello world');
    expect(decrypted.metadata).toMatchObject({
      operation: ClassicalCipherOperation.DECRYPT,
      plaintextLength: 11,
    });
  });

  it('decrypts binary Vigenere ciphertext back to source bytes', () => {
    const bytes = Buffer.from([0, 1, 2, 3, 4, 5]);
    const encrypted = runClassicalCipher(
      bytes.toString('hex'),
      ClassicalCipherAlgorithm.VIGENERE_KEY_SYMBOLS,
      {
        key: 'abc',
        inputEncoding: 'hex',
        whiteningEnabled: true,
      },
    );
    const decrypted = runClassicalCipher(
      encrypted.finalText,
      ClassicalCipherAlgorithm.VIGENERE_KEY_SYMBOLS,
      {
        operation: ClassicalCipherOperation.DECRYPT,
        key: 'abc',
        inputEncoding: 'hex',
        whiteningEnabled: true,
      },
    );

    expect(decrypted.finalText).toBe(bytes.toString('hex'));
  });

  it('decrypts Vigenere key-length final state with the final effective length', () => {
    const encrypted = runClassicalCipher(
      'attack at dawn',
      ClassicalCipherAlgorithm.VIGENERE_KEY_LENGTHS,
      {
        key: 'KEY',
        keyLengths: [1, 3],
      },
    );
    const decrypted = runClassicalCipher(
      encrypted.finalText,
      ClassicalCipherAlgorithm.VIGENERE_KEY_LENGTHS,
      {
        operation: ClassicalCipherOperation.DECRYPT,
        key: 'KEY',
        keyLengths: [1, 3],
      },
    );

    expect(encrypted.finalText).toBe('kxrkgi kx bkal');
    expect(decrypted.finalText).toBe('attack at dawn');
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
      parameters: { shift: 3, maxSteps: undefined, inputEncoding: 'utf8' },
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

  it('queues a Caesar decrypt job from a completed encrypted source job', async () => {
    const workerSpy = jest
      .spyOn(service as never, 'runCipherWorker')
      .mockResolvedValue({
        finalText: 'hello world',
        steps: [],
        metricStats: [],
      } as never);
    cipherJobsRepo.findOne.mockResolvedValue({
      id: '26ee863d-df65-43f5-b63d-1ed48098a5f2',
      parsedTextId: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
      algorithm: ClassicalCipherAlgorithm.CAESAR,
      status: ClassicalCipherJobStatus.COMPLETED,
      finalText: 'khoor zruog',
      parameters: {
        operation: ClassicalCipherOperation.ENCRYPT,
        shift: 3,
        inputEncoding: 'utf8',
      },
    });
    parsedTextsRepo.findOne.mockResolvedValue({
      id: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
      status: ParsedTextStatus.COMPLETED,
      words: ['hello', 'world'],
    });

    const result = await service.createCaesarJob(
      '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
      3,
      undefined,
      false,
      ClassicalCipherOperation.DECRYPT,
      '26ee863d-df65-43f5-b63d-1ed48098a5f2',
    );

    expect(result.parameters).toMatchObject({
      operation: ClassicalCipherOperation.DECRYPT,
      inputEncoding: 'utf8',
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(workerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'khoor zruog',
        algorithm: ClassicalCipherAlgorithm.CAESAR,
        parameters: expect.objectContaining({
          operation: ClassicalCipherOperation.DECRYPT,
          inputEncoding: 'utf8',
        }),
      }),
      '0f50273c-4181-4496-9648-e84f355cedee',
    );
  });

  it('deletes a classical cipher job', async () => {
    await service.deleteJob('0f50273c-4181-4496-9648-e84f355cedee');

    expect(cipherJobsRepo.delete).toHaveBeenCalledWith(
      '0f50273c-4181-4496-9648-e84f355cedee',
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

  it('queues binary parsed text jobs with hex input encoding', async () => {
    jest.spyOn(service as never, 'runCipherWorker').mockResolvedValue({
      finalText: '00ff',
      steps: [],
      metricStats: [],
    } as never);
    parsedTextsRepo.findOne.mockResolvedValue({
      id: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
      status: ParsedTextStatus.COMPLETED,
      content: '00ff',
      contentEncoding: ParsedTextContentEncoding.HEX,
      words: ['00ff'],
    });

    await service.createCaesarJob('5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f', 0);

    expect(cipherJobsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        parameters: expect.objectContaining({ inputEncoding: 'hex' }),
      }),
    );
  });
});
