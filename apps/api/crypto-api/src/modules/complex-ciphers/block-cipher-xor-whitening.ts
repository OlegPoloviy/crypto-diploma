import { BadRequestException } from '@nestjs/common';
import { BinaryEncoding } from './complex-ciphers.types';
import { parseBytes } from './aes.engine';

export interface XorWhiteningKeys {
  kPre: Uint8Array;
  kPost: Uint8Array;
}

export interface XorWhiteningOptions {
  enabled: boolean;
  keys?: XorWhiteningKeys;
}

export interface XorWhiteningParameterInput {
  whiteningEnabled?: boolean;
  kPre?: string;
  kPost?: string;
  whiteningKeyEncoding?: BinaryEncoding;
}

export function xorBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  if (left.length !== right.length) {
    throw new BadRequestException('XOR operands must have the same length');
  }

  const output = new Uint8Array(left.length);
  for (let index = 0; index < left.length; index += 1) {
    output[index] = left[index] ^ right[index];
  }

  return output;
}

export function deriveXorWhiteningKeys(
  key: Uint8Array,
  blockSize: number,
): XorWhiteningKeys {
  const kPre = expandToBlockSize(key, blockSize);
  const kPost = expandToBlockSize(
    Uint8Array.from(key, (byte, index) => byte ^ (index + 1)),
    blockSize,
  );

  return { kPre, kPost };
}

export function resolveXorWhiteningOptions(
  key: Uint8Array,
  blockSize: number,
  parameters?: XorWhiteningParameterInput,
): XorWhiteningOptions {
  const enabled = parameters?.whiteningEnabled ?? false;
  if (!enabled) {
    return { enabled: false };
  }

  const encoding =
    parameters?.whiteningKeyEncoding ?? BinaryEncoding.HEX;
  const explicitKeys =
    parameters?.kPre || parameters?.kPost
      ? {
          kPre: parameters.kPre
            ? parseBytes(parameters.kPre, encoding, 'kPre')
            : undefined,
          kPost: parameters.kPost
            ? parseBytes(parameters.kPost, encoding, 'kPost')
            : undefined,
        }
      : undefined;

  const derived = deriveXorWhiteningKeys(key, blockSize);
  const kPre = explicitKeys?.kPre ?? derived.kPre;
  const kPost = explicitKeys?.kPost ?? derived.kPost;

  assertBlockSizedKey(kPre, blockSize, 'kPre');
  assertBlockSizedKey(kPost, blockSize, 'kPost');

  return {
    enabled: true,
    keys: { kPre, kPost },
  };
}

export function encryptBlockWithXorWhitening(
  block: Uint8Array,
  roundKeys: Uint8Array[],
  whitening: XorWhiteningKeys,
  encryptBlock: (input: Uint8Array, keys: Uint8Array[]) => Uint8Array,
): Uint8Array {
  const preWhitened = xorBytes(block, whitening.kPre);
  const encrypted = encryptBlock(preWhitened, roundKeys);

  return xorBytes(encrypted, whitening.kPost);
}

export function decryptBlockWithXorWhitening(
  block: Uint8Array,
  roundKeys: Uint8Array[],
  whitening: XorWhiteningKeys,
  decryptBlock: (input: Uint8Array, keys: Uint8Array[]) => Uint8Array,
): Uint8Array {
  const postRemoved = xorBytes(block, whitening.kPost);
  const decrypted = decryptBlock(postRemoved, roundKeys);

  return xorBytes(decrypted, whitening.kPre);
}

function expandToBlockSize(key: Uint8Array, blockSize: number): Uint8Array {
  if (key.length === 0) {
    throw new BadRequestException('Key cannot be empty');
  }

  const output = new Uint8Array(blockSize);
  for (let index = 0; index < blockSize; index += 1) {
    output[index] = key[index % key.length] ^ ((index * 31 + 0x5a) & 0xff);
  }

  return output;
}

function assertBlockSizedKey(
  value: Uint8Array,
  blockSize: number,
  label: string,
): void {
  if (value.length !== blockSize) {
    throw new BadRequestException(
      `${label} must decode to exactly ${blockSize} bytes`,
    );
  }
}
