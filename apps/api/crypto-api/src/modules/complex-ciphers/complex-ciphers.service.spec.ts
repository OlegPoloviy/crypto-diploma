import { BadRequestException } from '@nestjs/common';
import {
  decryptAes,
  decryptAesBlock,
  encryptAes,
  encryptAesBlock,
  encryptAesCorpusWithSampledSteps,
  encryptAesCorpusWithSteps,
  encryptAesWithSteps,
  parseBytes,
} from './aes.engine';
import {
  decryptDes,
  decryptDesBlock,
  encryptDes,
  encryptDesBlock,
  encryptDesCorpusWithSampledSteps,
  encryptDesCorpusWithSteps,
  encryptDesWithSteps,
} from './des.engine';
import { runComplexCipher } from './complex-ciphers.engine';
import { ComplexCiphersService } from './complex-ciphers.service';
import { ParsedTextStatus } from '../text-parser/parsed-text.entity';
import {
  AesMode,
  BinaryEncoding,
  ComplexCipherAlgorithm,
  ComplexCipherJobStatus,
} from './complex-ciphers.types';

describe('ComplexCiphersService', () => {
  let service: ComplexCiphersService;
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

    service = new ComplexCiphersService(
      parsedTextsRepo as never,
      cipherJobsRepo as never,
      textParserService as never,
    );
  });

  it('matches the AES-128 FIPS block test vector', () => {
    const plaintext = parseBytes(
      '00112233445566778899aabbccddeeff',
      BinaryEncoding.HEX,
      'plaintext',
    );
    const key = parseBytes(
      '000102030405060708090a0b0c0d0e0f',
      BinaryEncoding.HEX,
      'key',
    );

    const ciphertext = encryptAesBlock(plaintext, key);
    const decrypted = decryptAesBlock(ciphertext, key);

    expect(Buffer.from(ciphertext).toString('hex')).toBe(
      '69c4e0d86a7b0430d8cdb78070b4c55a',
    );
    expect(Buffer.from(decrypted).toString('hex')).toBe(
      '00112233445566778899aabbccddeeff',
    );
  });

  it('exposes AES-128 block encryption states after whitening and each round', () => {
    const plaintext = parseBytes(
      '00112233445566778899aabbccddeeff',
      BinaryEncoding.HEX,
      'plaintext',
    );
    const key = parseBytes(
      '000102030405060708090a0b0c0d0e0f',
      BinaryEncoding.HEX,
      'key',
    );

    const steps = encryptAesWithSteps(plaintext, key);

    expect(steps).toHaveLength(11);
    expect(Buffer.from(steps[0]).toString('hex')).toBe(
      '00102030405060708090a0b0c0d0e0f0',
    );
    expect(Buffer.from(steps.at(-1) as Uint8Array).toString('hex')).toBe(
      '69c4e0d86a7b0430d8cdb78070b4c55a',
    );
  });

  it('matches AES-192 and AES-256 FIPS block test vectors', () => {
    const plaintext = parseBytes(
      '00112233445566778899aabbccddeeff',
      BinaryEncoding.HEX,
      'plaintext',
    );
    const aes192Key = parseBytes(
      '000102030405060708090a0b0c0d0e0f1011121314151617',
      BinaryEncoding.HEX,
      'key',
    );
    const aes256Key = parseBytes(
      '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
      BinaryEncoding.HEX,
      'key',
    );

    expect(
      Buffer.from(encryptAesBlock(plaintext, aes192Key)).toString('hex'),
    ).toBe('dda97ca4864cdfe06eaf70a0ec0d7191');
    expect(
      Buffer.from(encryptAesBlock(plaintext, aes256Key)).toString('hex'),
    ).toBe('8ea2b7ca516745bfeafc49904b496089');
  });

  it('encrypts and decrypts UTF-8 text in CBC mode with PKCS#7 padding', () => {
    const key = parseBytes(
      '000102030405060708090a0b0c0d0e0f',
      BinaryEncoding.HEX,
      'key',
    );
    const iv = parseBytes(
      '101112131415161718191a1b1c1d1e1f',
      BinaryEncoding.HEX,
      'iv',
    );
    const plaintext = parseBytes('hello AES', BinaryEncoding.UTF8, 'plaintext');

    const encrypted = encryptAes(plaintext, key, { mode: AesMode.CBC, iv });
    const decrypted = decryptAes(encrypted.ciphertext, key, {
      mode: AesMode.CBC,
      iv,
    });

    expect(Buffer.from(encrypted.ciphertext).toString('hex')).toBe(
      'c7ffa7dc5d5ec3069bb369dcbe3d838f',
    );
    expect(Buffer.from(decrypted.plaintext).toString('utf8')).toBe('hello AES');
  });

  it('aggregates AES states by round across the full padded corpus', () => {
    const key = parseBytes(
      '000102030405060708090a0b0c0d0e0f',
      BinaryEncoding.HEX,
      'key',
    );
    const iv = parseBytes(
      '101112131415161718191a1b1c1d1e1f',
      BinaryEncoding.HEX,
      'iv',
    );
    const plaintext = parseBytes(
      'corpus text that spans multiple blocks',
      BinaryEncoding.UTF8,
      'plaintext',
    );

    const encrypted = encryptAes(plaintext, key, { mode: AesMode.CBC, iv });
    const steps = encryptAesCorpusWithSteps(plaintext, key, {
      mode: AesMode.CBC,
      iv,
    });

    expect(steps).toHaveLength(11);
    expect(
      steps.every((step) => step.length === encrypted.ciphertext.length),
    ).toBe(true);
    expect(Buffer.from(steps.at(-1) as Uint8Array).toString('hex')).toBe(
      Buffer.from(encrypted.ciphertext).toString('hex'),
    );
  });

  it('samples AES corpus step states without truncating the final ciphertext', () => {
    const key = parseBytes(
      '000102030405060708090a0b0c0d0e0f',
      BinaryEncoding.HEX,
      'key',
    );
    const iv = parseBytes(
      '101112131415161718191a1b1c1d1e1f',
      BinaryEncoding.HEX,
      'iv',
    );
    const plaintext = new TextEncoder().encode('a'.repeat(60_000));

    const encrypted = encryptAes(plaintext, key, { mode: AesMode.CBC, iv });
    const result = encryptAesCorpusWithSampledSteps(plaintext, key, {
      mode: AesMode.CBC,
      iv,
    });

    expect(Buffer.from(result.ciphertext).toString('hex')).toBe(
      Buffer.from(encrypted.ciphertext).toString('hex'),
    );
    expect(result.sampleSize).toBe(50_000);
    expect(result.steps).toHaveLength(11);
    expect(result.steps.every((step) => step.length === 50_000)).toBe(true);
    expect(result.steps.at(-1)?.length).toBeLessThan(result.ciphertext.length);
  });

  it('calculates AES job step metrics from raw bytes instead of hex text', () => {
    const result = runComplexCipher(
      'corpus text that spans multiple blocks',
      ComplexCipherAlgorithm.AES,
      {
        key: '000102030405060708090a0b0c0d0e0f',
        mode: AesMode.CBC,
        iv: '101112131415161718191a1b1c1d1e1f',
      },
    );

    expect(result.steps).toHaveLength(11);
    expect(result.steps?.at(-1)?.text).toBe(result.finalText);
    expect(result.metricStats).toContainEqual(
      expect.objectContaining({
        key: 'wordFrequencyEntropy',
        label: 'Byte entropy',
      }),
    );
    expect(result.metadata.byteEntropy).toBe(
      result.steps?.at(-1)?.wordFrequencyEntropy,
    );
  });

  it('matches the DES FIPS block test vector', () => {
    const plaintext = parseBytes(
      '0123456789abcdef',
      BinaryEncoding.HEX,
      'plaintext',
    );
    const key = parseBytes('133457799bbcdff1', BinaryEncoding.HEX, 'key');

    const ciphertext = encryptDesBlock(plaintext, key);
    const decrypted = decryptDesBlock(ciphertext, key);

    expect(Buffer.from(ciphertext).toString('hex')).toBe('85e813540f0ab405');
    expect(Buffer.from(decrypted).toString('hex')).toBe('0123456789abcdef');
  });

  it('exposes DES block encryption states after each Feistel round', () => {
    const plaintext = parseBytes(
      '0123456789abcdef',
      BinaryEncoding.HEX,
      'plaintext',
    );
    const key = parseBytes('133457799bbcdff1', BinaryEncoding.HEX, 'key');

    const steps = encryptDesWithSteps(plaintext, key);

    expect(steps).toHaveLength(16);
    expect(Buffer.from(steps.at(-1) as Uint8Array).toString('hex')).toBe(
      '85e813540f0ab405',
    );
  });

  it('encrypts and decrypts UTF-8 text in DES CBC mode with PKCS#7 padding', () => {
    const key = parseBytes('133457799bbcdff1', BinaryEncoding.HEX, 'key');
    const iv = parseBytes('1234567890abcdef', BinaryEncoding.HEX, 'iv');
    const plaintext = parseBytes('hello DES', BinaryEncoding.UTF8, 'plaintext');

    const encrypted = encryptDes(plaintext, key, { mode: AesMode.CBC, iv });
    const decrypted = decryptDes(encrypted.ciphertext, key, {
      mode: AesMode.CBC,
      iv,
    });

    expect(Buffer.from(decrypted.plaintext).toString('utf8')).toBe('hello DES');
    expect(encrypted.ciphertext.length % 8).toBe(0);
  });

  it('aggregates DES states by round across the full padded corpus', () => {
    const key = parseBytes('133457799bbcdff1', BinaryEncoding.HEX, 'key');
    const iv = parseBytes('1234567890abcdef', BinaryEncoding.HEX, 'iv');
    const plaintext = parseBytes(
      'corpus text that spans multiple blocks',
      BinaryEncoding.UTF8,
      'plaintext',
    );

    const encrypted = encryptDes(plaintext, key, { mode: AesMode.CBC, iv });
    const steps = encryptDesCorpusWithSteps(plaintext, key, {
      mode: AesMode.CBC,
      iv,
    });

    expect(steps).toHaveLength(16);
    expect(
      steps.every((step) => step.length === encrypted.ciphertext.length),
    ).toBe(true);
    expect(Buffer.from(steps.at(-1) as Uint8Array).toString('hex')).toBe(
      Buffer.from(encrypted.ciphertext).toString('hex'),
    );
  });

  it('samples DES corpus step states without truncating the final ciphertext', () => {
    const key = parseBytes('133457799bbcdff1', BinaryEncoding.HEX, 'key');
    const iv = parseBytes('1234567890abcdef', BinaryEncoding.HEX, 'iv');
    const plaintext = new TextEncoder().encode('a'.repeat(60_000));

    const encrypted = encryptDes(plaintext, key, { mode: AesMode.CBC, iv });
    const result = encryptDesCorpusWithSampledSteps(plaintext, key, {
      mode: AesMode.CBC,
      iv,
    });

    expect(Buffer.from(result.ciphertext).toString('hex')).toBe(
      Buffer.from(encrypted.ciphertext).toString('hex'),
    );
    expect(result.sampleSize).toBe(1_024);
    expect(result.steps).toHaveLength(16);
    expect(result.steps.every((step) => step.length === 1_024)).toBe(true);
    expect(result.steps.at(-1)?.length).toBeLessThan(result.ciphertext.length);
  });

  it('calculates DES job step metrics from raw bytes instead of hex text', () => {
    const result = runComplexCipher(
      'corpus text that spans multiple blocks',
      ComplexCipherAlgorithm.DES,
      {
        key: '133457799bbcdff1',
        mode: AesMode.CBC,
        iv: '1234567890abcdef',
      },
    );

    expect(result.steps).toHaveLength(16);
    expect(result.steps?.at(-1)?.text).toBe(result.finalText);
    expect(result.metadata).toMatchObject({
      algorithm: 'des',
      keySize: 64,
      byteEntropy: result.steps?.at(-1)?.wordFrequencyEntropy,
    });
  });

  it('stores sampled AES job step payloads for large corpora', () => {
    const result = runComplexCipher(
      'a'.repeat(60_000),
      ComplexCipherAlgorithm.AES,
      {
        key: '000102030405060708090a0b0c0d0e0f',
        mode: AesMode.CBC,
        iv: '101112131415161718191a1b1c1d1e1f',
      },
    );

    expect(result.metadata).toMatchObject({
      ciphertextLength: 60_016,
      stepSampleSize: 50_000,
      stepSampled: true,
      stepSampleSourceBytes: 60_016,
    });
    expect(result.steps?.at(-1)?.text.length).toBeLessThan(
      result.finalText.length,
    );
  });

  it('exposes AES encryption through the service DTO contract', () => {
    const result = service.encryptAes({
      plaintext: '00112233445566778899aabbccddeeff',
      inputEncoding: BinaryEncoding.HEX,
      key: '000102030405060708090a0b0c0d0e0f',
      keyEncoding: BinaryEncoding.HEX,
      outputEncoding: BinaryEncoding.HEX,
      mode: AesMode.ECB,
    });

    expect(result).toMatchObject({
      mode: AesMode.ECB,
      keySize: 128,
      outputEncoding: BinaryEncoding.HEX,
    });
    expect(result.result.slice(0, 32)).toBe('69c4e0d86a7b0430d8cdb78070b4c55a');
  });

  it('exposes DES encryption through the service DTO contract', () => {
    const result = service.encryptDes({
      plaintext: '0123456789abcdef',
      inputEncoding: BinaryEncoding.HEX,
      key: '133457799bbcdff1',
      keyEncoding: BinaryEncoding.HEX,
      outputEncoding: BinaryEncoding.HEX,
      mode: AesMode.ECB,
    });

    expect(result).toMatchObject({
      mode: AesMode.ECB,
      keySize: 64,
      outputEncoding: BinaryEncoding.HEX,
    });
    expect(result.result.slice(0, 16)).toBe('85e813540f0ab405');
  });

  it('rejects invalid keys and missing CBC IVs', () => {
    expect(() =>
      service.encryptAes({
        plaintext: 'hello',
        key: 'abcd',
        mode: AesMode.ECB,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      service.encryptAes({
        plaintext: 'hello',
        key: '000102030405060708090a0b0c0d0e0f',
        mode: AesMode.CBC,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects invalid DES keys and missing CBC IVs', () => {
    expect(() =>
      service.encryptDes({
        plaintext: 'hello',
        key: 'abcd',
        mode: AesMode.ECB,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      service.encryptDes({
        plaintext: 'hello',
        key: '133457799bbcdff1',
        mode: AesMode.CBC,
      }),
    ).toThrow(BadRequestException);
  });

  it('queues an AES job for completed parsed text and processes it in worker', async () => {
    jest.spyOn(service as never, 'runCipherWorker').mockResolvedValue({
      finalText: 'c7ffa7dc5d5ec3069bb369dcbe3d838f',
      metricStats: [
        {
          key: 'hurstExponent',
          label: 'Hurst',
          final: 0.5,
          mean: 0.5,
          standardDeviation: 0,
          min: 0.5,
          max: 0.5,
        },
      ],
      metadata: {
        mode: AesMode.CBC,
        keySize: 128,
        outputEncoding: BinaryEncoding.HEX,
        byteEntropy: 4,
      },
    } as never);
    parsedTextsRepo.findOne.mockResolvedValue({
      id: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
      status: ParsedTextStatus.COMPLETED,
      words: ['hello', 'AES'],
    });

    const result = await service.createAesJob({
      parsedTextId: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
      key: '000102030405060708090a0b0c0d0e0f',
      mode: AesMode.CBC,
      iv: '101112131415161718191a1b1c1d1e1f',
    });

    expect(result).toMatchObject({
      id: '0f50273c-4181-4496-9648-e84f355cedee',
      parsedTextId: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
      algorithm: ComplexCipherAlgorithm.AES,
      status: ComplexCipherJobStatus.QUEUED,
    });
    expect(cipherJobsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        parsedTextId: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
        algorithm: ComplexCipherAlgorithm.AES,
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(cipherJobsRepo.update).toHaveBeenCalledWith(
      '0f50273c-4181-4496-9648-e84f355cedee',
      expect.objectContaining({
        status: ComplexCipherJobStatus.COMPLETED,
        finalText: 'c7ffa7dc5d5ec3069bb369dcbe3d838f',
        metricStats: expect.arrayContaining([
          expect.objectContaining({ key: 'hurstExponent' }),
        ]),
      }),
    );
  });

  it('queues a DES job for completed parsed text and processes it in worker', async () => {
    jest.spyOn(service as never, 'runCipherWorker').mockResolvedValue({
      finalText: '85e813540f0ab405',
      metricStats: [
        {
          key: 'hurstExponent',
          label: 'Hurst',
          final: 0.5,
          mean: 0.5,
          standardDeviation: 0,
          min: 0.5,
          max: 0.5,
        },
      ],
      metadata: {
        mode: AesMode.CBC,
        keySize: 64,
        outputEncoding: BinaryEncoding.HEX,
        byteEntropy: 4,
      },
    } as never);
    parsedTextsRepo.findOne.mockResolvedValue({
      id: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
      status: ParsedTextStatus.COMPLETED,
      words: ['hello', 'DES'],
    });

    const result = await service.createDesJob({
      parsedTextId: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
      key: '133457799bbcdff1',
      mode: AesMode.CBC,
      iv: '1234567890abcdef',
    });

    expect(result).toMatchObject({
      id: '0f50273c-4181-4496-9648-e84f355cedee',
      parsedTextId: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
      algorithm: ComplexCipherAlgorithm.DES,
      status: ComplexCipherJobStatus.QUEUED,
    });
    expect(cipherJobsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        parsedTextId: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
        algorithm: ComplexCipherAlgorithm.DES,
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(cipherJobsRepo.update).toHaveBeenCalledWith(
      '0f50273c-4181-4496-9648-e84f355cedee',
      expect.objectContaining({
        status: ComplexCipherJobStatus.COMPLETED,
        finalText: '85e813540f0ab405',
        metricStats: expect.arrayContaining([
          expect.objectContaining({ key: 'hurstExponent' }),
        ]),
      }),
    );
  });

  it('deletes a complex cipher job', async () => {
    await service.deleteJob('0f50273c-4181-4496-9648-e84f355cedee');

    expect(cipherJobsRepo.delete).toHaveBeenCalledWith(
      '0f50273c-4181-4496-9648-e84f355cedee',
    );
  });

  it('rejects AES jobs for parsed texts that are still processing', async () => {
    parsedTextsRepo.findOne.mockResolvedValue({
      id: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
      status: ParsedTextStatus.PROCESSING,
      words: ['hello'],
    });

    await expect(
      service.createAesJob({
        parsedTextId: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
        key: '000102030405060708090a0b0c0d0e0f',
        mode: AesMode.CBC,
        iv: '101112131415161718191a1b1c1d1e1f',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
