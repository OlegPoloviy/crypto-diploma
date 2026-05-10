import { BadRequestException } from '@nestjs/common';
import {
  decryptAes,
  decryptAesBlock,
  encryptAes,
  encryptAesBlock,
  parseBytes,
} from './aes.engine';
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

    service = new ComplexCiphersService(
      parsedTextsRepo as never,
      cipherJobsRepo as never,
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
