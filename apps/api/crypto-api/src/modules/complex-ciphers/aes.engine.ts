import { BadRequestException } from '@nestjs/common';
import { AesMode, BinaryEncoding } from './complex-ciphers.types';

const BLOCK_SIZE = 16;
const DEFAULT_AES_STEP_SAMPLE_SIZE = 50_000;
const S_BOX = [
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe,
  0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4,
  0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7,
  0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15, 0x04, 0xc7, 0x23, 0xc3,
  0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75, 0x09,
  0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3,
  0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe,
  0x39, 0x4a, 0x4c, 0x58, 0xcf, 0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85,
  0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92,
  0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c,
  0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19,
  0x73, 0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14,
  0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2,
  0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5,
  0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08, 0xba, 0x78, 0x25,
  0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86,
  0xc1, 0x1d, 0x9e, 0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e,
  0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf, 0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42,
  0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
];
const INV_S_BOX = [
  0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81,
  0xf3, 0xd7, 0xfb, 0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e,
  0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb, 0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23,
  0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e, 0x08, 0x2e, 0xa1, 0x66,
  0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25, 0x72,
  0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65,
  0xb6, 0x92, 0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46,
  0x57, 0xa7, 0x8d, 0x9d, 0x84, 0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a,
  0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06, 0xd0, 0x2c, 0x1e, 0x8f, 0xca,
  0x3f, 0x0f, 0x02, 0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b, 0x3a, 0x91,
  0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6,
  0x73, 0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8,
  0x1c, 0x75, 0xdf, 0x6e, 0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89, 0x6f,
  0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b, 0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2,
  0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4, 0x1f, 0xdd, 0xa8,
  0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f,
  0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93,
  0xc9, 0x9c, 0xef, 0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb,
  0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61, 0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6,
  0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d,
];
const RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

interface AesOptions {
  mode?: AesMode;
  iv?: Uint8Array;
}

export interface AesCorpusSampledStepsResult {
  ciphertext: Uint8Array;
  steps: Uint8Array[];
  sampleSize: number;
  totalBytes: number;
}

export function encryptAes(
  plaintext: Uint8Array,
  key: Uint8Array,
  options: AesOptions = {},
): { ciphertext: Uint8Array; iv?: Uint8Array } {
  const mode = options.mode ?? AesMode.CBC;
  const roundKeys = expandKey(key);
  const padded = addPkcs7Padding(plaintext);
  const iv = getIv(mode, options.iv);
  let previous = iv;
  const output: number[] = [];

  for (let offset = 0; offset < padded.length; offset += BLOCK_SIZE) {
    let block: Uint8Array = padded.slice(offset, offset + BLOCK_SIZE);
    if (mode === AesMode.CBC) {
      block = xorBlocks(block, previous);
    }

    const encrypted = encryptBlock(block, roundKeys);
    output.push(...encrypted);
    previous = encrypted;
  }

  return {
    ciphertext: Uint8Array.from(output),
    iv: mode === AesMode.CBC ? iv : undefined,
  };
}

export function decryptAes(
  ciphertext: Uint8Array,
  key: Uint8Array,
  options: AesOptions = {},
): { plaintext: Uint8Array; iv?: Uint8Array } {
  const mode = options.mode ?? AesMode.CBC;
  if (ciphertext.length === 0 || ciphertext.length % BLOCK_SIZE !== 0) {
    throw new BadRequestException(
      'Ciphertext length must be a multiple of 16 bytes',
    );
  }

  const roundKeys = expandKey(key);
  const iv = getIv(mode, options.iv);
  let previous = iv;
  const output: number[] = [];

  for (let offset = 0; offset < ciphertext.length; offset += BLOCK_SIZE) {
    const block: Uint8Array = ciphertext.slice(offset, offset + BLOCK_SIZE);
    let decrypted = decryptBlock(block, roundKeys);
    if (mode === AesMode.CBC) {
      decrypted = xorBlocks(decrypted, previous);
    }

    output.push(...decrypted);
    previous = block;
  }

  return {
    plaintext: removePkcs7Padding(Uint8Array.from(output)),
    iv: mode === AesMode.CBC ? iv : undefined,
  };
}

export function encryptAesCorpusWithSteps(
  plaintext: Uint8Array,
  key: Uint8Array,
  options: AesOptions = {},
): Uint8Array[] {
  const mode = options.mode ?? AesMode.CBC;
  const roundKeys = expandKey(key);
  const roundBuffers: number[][] = Array.from(
    { length: roundKeys.length },
    () => [],
  );
  const padded = addPkcs7Padding(plaintext);
  const iv = getIv(mode, options.iv);
  let previous = iv;

  for (let offset = 0; offset < padded.length; offset += BLOCK_SIZE) {
    let block: Uint8Array = padded.slice(offset, offset + BLOCK_SIZE);
    if (mode === AesMode.CBC) {
      block = xorBlocks(block, previous);
    }

    const steps = encryptAesWithSteps(block, roundKeys);
    steps.forEach((step, index) => roundBuffers[index].push(...step));
    previous = steps.at(-1) as Uint8Array;
  }

  return roundBuffers.map((buffer) => Uint8Array.from(buffer));
}

export function encryptAesCorpusWithSampledSteps(
  plaintext: Uint8Array,
  key: Uint8Array,
  options: AesOptions = {},
  maxSampleSize = DEFAULT_AES_STEP_SAMPLE_SIZE,
): AesCorpusSampledStepsResult {
  const mode = options.mode ?? AesMode.CBC;
  const roundKeys = expandKey(key);
  const padded = addPkcs7Padding(plaintext);
  const samplePlan = createSamplePlan(padded.length, maxSampleSize);
  const stepSamples: number[][] = Array.from(
    { length: roundKeys.length },
    () => [],
  );
  const ciphertext: number[] = [];
  const iv = getIv(mode, options.iv);
  let previous = iv;

  for (let offset = 0; offset < padded.length; offset += BLOCK_SIZE) {
    let block: Uint8Array = padded.slice(offset, offset + BLOCK_SIZE);
    if (mode === AesMode.CBC) {
      block = xorBlocks(block, previous);
    }

    const steps = encryptAesWithSteps(block, roundKeys);
    steps.forEach((step, stepIndex) => {
      collectStepSample(stepSamples[stepIndex], step, offset, samplePlan);
    });

    const encrypted = steps.at(-1) as Uint8Array;
    ciphertext.push(...encrypted);
    previous = encrypted;
  }

  return {
    ciphertext: Uint8Array.from(ciphertext),
    steps: stepSamples.map((sample) => Uint8Array.from(sample)),
    sampleSize: samplePlan.size,
    totalBytes: padded.length,
  };
}

export function encryptAesBlock(
  block: Uint8Array,
  key: Uint8Array,
): Uint8Array {
  assertBlock(block, 'Plaintext block');
  return encryptBlock(block, expandKey(key));
}

export function decryptAesBlock(
  block: Uint8Array,
  key: Uint8Array,
): Uint8Array {
  assertBlock(block, 'Ciphertext block');
  return decryptBlock(block, expandKey(key));
}

export function encryptAesWithSteps(
  block: Uint8Array,
  roundKeys: Uint8Array[],
): Uint8Array[];
export function encryptAesWithSteps(
  block: Uint8Array,
  key: Uint8Array,
): Uint8Array[];
export function encryptAesWithSteps(
  block: Uint8Array,
  keyOrRoundKeys: Uint8Array | Uint8Array[],
): Uint8Array[] {
  assertBlock(block, 'Plaintext block');
  const roundKeys = Array.isArray(keyOrRoundKeys)
    ? keyOrRoundKeys
    : expandKey(keyOrRoundKeys);
  assertRoundKeys(roundKeys);

  const steps: Uint8Array[] = [];
  const state = block.slice();

  addRoundKey(state, roundKeys[0]);
  steps.push(state.slice());

  for (let round = 1; round < roundKeys.length - 1; round += 1) {
    subBytes(state, S_BOX);
    shiftRows(state);
    mixColumns(state);
    addRoundKey(state, roundKeys[round]);
    steps.push(state.slice());
  }

  subBytes(state, S_BOX);
  shiftRows(state);
  addRoundKey(state, roundKeys.at(-1) as Uint8Array);
  steps.push(state.slice());

  return steps;
}

export function parseBytes(
  value: string,
  encoding: BinaryEncoding,
  fieldName: string,
): Uint8Array {
  try {
    switch (encoding) {
      case BinaryEncoding.UTF8:
        return new TextEncoder().encode(value);
      case BinaryEncoding.HEX:
        if (value.length % 2 !== 0 || !/^[\da-f]*$/i.test(value)) {
          throw new Error('invalid hex');
        }
        return Uint8Array.from(Buffer.from(value, 'hex'));
      case BinaryEncoding.BASE64:
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) {
          throw new Error('invalid base64');
        }
        return Uint8Array.from(Buffer.from(value, 'base64'));
      default:
        throw new Error('unsupported encoding');
    }
  } catch {
    throw new BadRequestException(`${fieldName} is not valid ${encoding}`);
  }
}

export function formatBytes(
  bytes: Uint8Array,
  encoding: BinaryEncoding,
): string {
  try {
    switch (encoding) {
      case BinaryEncoding.UTF8:
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      case BinaryEncoding.HEX:
        return Buffer.from(bytes).toString('hex');
      case BinaryEncoding.BASE64:
        return Buffer.from(bytes).toString('base64');
      default:
        throw new BadRequestException('Unsupported output encoding');
    }
  } catch {
    throw new BadRequestException(`Result is not valid ${encoding}`);
  }
}

function encryptBlock(block: Uint8Array, roundKeys: Uint8Array[]): Uint8Array {
  return encryptAesWithSteps(block, roundKeys).at(-1) as Uint8Array;
}

function decryptBlock(block: Uint8Array, roundKeys: Uint8Array[]): Uint8Array {
  const state = block.slice();
  addRoundKey(state, roundKeys.at(-1) as Uint8Array);

  for (let round = roundKeys.length - 2; round > 0; round -= 1) {
    invShiftRows(state);
    subBytes(state, INV_S_BOX);
    addRoundKey(state, roundKeys[round]);
    invMixColumns(state);
  }

  invShiftRows(state);
  subBytes(state, INV_S_BOX);
  addRoundKey(state, roundKeys[0]);

  return state;
}

function expandKey(key: Uint8Array): Uint8Array[] {
  assertKey(key);
  const nk = key.length / 4;
  const nr = nk + 6;
  const words: number[][] = [];

  for (let index = 0; index < nk; index += 1) {
    words[index] = Array.from(key.slice(index * 4, index * 4 + 4));
  }

  for (let index = nk; index < 4 * (nr + 1); index += 1) {
    let temp = [...words[index - 1]];
    if (index % nk === 0) {
      temp = subWord(rotWord(temp));
      temp[0] ^= RCON[index / nk];
    } else if (nk > 6 && index % nk === 4) {
      temp = subWord(temp);
    }

    words[index] = xorWords(words[index - nk], temp);
  }

  return Array.from({ length: nr + 1 }, (_, round) =>
    Uint8Array.from(words.slice(round * 4, round * 4 + 4).flat()),
  );
}

function subBytes(state: Uint8Array, box: number[]): void {
  for (let index = 0; index < state.length; index += 1) {
    state[index] = box[state[index]];
  }
}

function shiftRows(state: Uint8Array): void {
  for (let row = 1; row < 4; row += 1) {
    const values = [0, 1, 2, 3].map((column) => state[row + 4 * column]);
    for (let column = 0; column < 4; column += 1) {
      state[row + 4 * column] = values[(column + row) % 4];
    }
  }
}

function invShiftRows(state: Uint8Array): void {
  for (let row = 1; row < 4; row += 1) {
    const values = [0, 1, 2, 3].map((column) => state[row + 4 * column]);
    for (let column = 0; column < 4; column += 1) {
      state[row + 4 * column] = values[(column - row + 4) % 4];
    }
  }
}

function mixColumns(state: Uint8Array): void {
  for (let column = 0; column < 4; column += 1) {
    const offset = column * 4;
    const a0 = state[offset];
    const a1 = state[offset + 1];
    const a2 = state[offset + 2];
    const a3 = state[offset + 3];
    state[offset] = multiply(a0, 2) ^ multiply(a1, 3) ^ a2 ^ a3;
    state[offset + 1] = a0 ^ multiply(a1, 2) ^ multiply(a2, 3) ^ a3;
    state[offset + 2] = a0 ^ a1 ^ multiply(a2, 2) ^ multiply(a3, 3);
    state[offset + 3] = multiply(a0, 3) ^ a1 ^ a2 ^ multiply(a3, 2);
  }
}

function invMixColumns(state: Uint8Array): void {
  for (let column = 0; column < 4; column += 1) {
    const offset = column * 4;
    const a0 = state[offset];
    const a1 = state[offset + 1];
    const a2 = state[offset + 2];
    const a3 = state[offset + 3];
    state[offset] =
      multiply(a0, 14) ^ multiply(a1, 11) ^ multiply(a2, 13) ^ multiply(a3, 9);
    state[offset + 1] =
      multiply(a0, 9) ^ multiply(a1, 14) ^ multiply(a2, 11) ^ multiply(a3, 13);
    state[offset + 2] =
      multiply(a0, 13) ^ multiply(a1, 9) ^ multiply(a2, 14) ^ multiply(a3, 11);
    state[offset + 3] =
      multiply(a0, 11) ^ multiply(a1, 13) ^ multiply(a2, 9) ^ multiply(a3, 14);
  }
}

function addRoundKey(state: Uint8Array, roundKey: Uint8Array): void {
  for (let index = 0; index < BLOCK_SIZE; index += 1) {
    state[index] ^= roundKey[index];
  }
}

function multiply(value: number, multiplier: number): number {
  let result = 0;
  let left = value;
  let right = multiplier;

  while (right > 0) {
    if (right & 1) {
      result ^= left;
    }

    left = xtime(left);
    right >>= 1;
  }

  return result & 0xff;
}

function xtime(value: number): number {
  return ((value << 1) ^ (value & 0x80 ? 0x1b : 0)) & 0xff;
}

function rotWord(word: number[]): number[] {
  return [word[1], word[2], word[3], word[0]];
}

function subWord(word: number[]): number[] {
  return word.map((byte) => S_BOX[byte]);
}

function xorWords(left: number[], right: number[]): number[] {
  return left.map((byte, index) => byte ^ right[index]);
}

function xorBlocks(left: Uint8Array, right: Uint8Array): Uint8Array {
  const result = new Uint8Array(left.length);
  for (let index = 0; index < left.length; index += 1) {
    result[index] = left[index] ^ right[index];
  }

  return result;
}

function addPkcs7Padding(bytes: Uint8Array): Uint8Array {
  const remainder = bytes.length % BLOCK_SIZE;
  const paddingLength = remainder === 0 ? BLOCK_SIZE : BLOCK_SIZE - remainder;
  const result = new Uint8Array(bytes.length + paddingLength);
  result.set(bytes);
  result.fill(paddingLength, bytes.length);

  return result;
}

function removePkcs7Padding(bytes: Uint8Array): Uint8Array {
  const paddingLength = bytes.at(-1) ?? 0;
  if (paddingLength < 1 || paddingLength > BLOCK_SIZE) {
    throw new BadRequestException('Invalid PKCS#7 padding');
  }

  const padding = bytes.slice(bytes.length - paddingLength);
  if (!padding.every((byte) => byte === paddingLength)) {
    throw new BadRequestException('Invalid PKCS#7 padding');
  }

  return bytes.slice(0, bytes.length - paddingLength);
}

function getIv(mode: AesMode, iv?: Uint8Array): Uint8Array {
  if (mode === AesMode.ECB) {
    return new Uint8Array(BLOCK_SIZE);
  }

  if (!iv) {
    throw new BadRequestException('CBC mode requires iv');
  }

  assertBlock(iv, 'IV');
  return iv;
}

function assertBlock(block: Uint8Array, label: string): void {
  if (block.length !== BLOCK_SIZE) {
    throw new BadRequestException(`${label} must be 16 bytes`);
  }
}

function assertKey(key: Uint8Array): void {
  if (![16, 24, 32].includes(key.length)) {
    throw new BadRequestException('AES key must be 16, 24, or 32 bytes');
  }
}

function assertRoundKeys(roundKeys: Uint8Array[]): void {
  if (![11, 13, 15].includes(roundKeys.length)) {
    throw new BadRequestException('AES round keys must match AES-128/192/256');
  }

  roundKeys.forEach((roundKey, index) => {
    assertBlock(roundKey, `AES round key ${index}`);
  });
}

function createSamplePlan(
  totalBytes: number,
  maxSampleSize: number,
): { size: number; totalBytes: number } {
  if (maxSampleSize < 1) {
    throw new BadRequestException('AES step sample size must be positive');
  }

  if (totalBytes <= maxSampleSize) {
    return { size: totalBytes, totalBytes };
  }

  return {
    size: maxSampleSize,
    totalBytes,
  };
}

function collectStepSample(
  sample: number[],
  blockState: Uint8Array,
  blockOffset: number,
  samplePlan: { size: number; totalBytes: number },
): void {
  if (sample.length >= samplePlan.size) {
    return;
  }

  for (let index = 0; index < blockState.length; index += 1) {
    const globalIndex = blockOffset + index;
    const targetIndex = Math.floor(
      (sample.length * samplePlan.totalBytes) / samplePlan.size,
    );

    if (globalIndex >= targetIndex) {
      sample.push(blockState[index]);
      if (sample.length >= samplePlan.size) {
        return;
      }
    }
  }
}
