import { BadRequestException } from '@nestjs/common';
import { AesMode, BinaryEncoding } from './complex-ciphers.types';
import {
  AES_BLOCK_SIZE as BLOCK_SIZE,
  AES_DEFAULT_STEP_SAMPLE_SIZE as DEFAULT_AES_STEP_SAMPLE_SIZE,
  AES_INV_S_BOX as INV_S_BOX,
  AES_RCON as RCON,
  AES_S_BOX as S_BOX,
} from './aes.constants';

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
    const encrypted = getFinalStep(steps, 'AES encryption');
    steps.forEach((step, index) => roundBuffers[index].push(...step));
    previous = encrypted;
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

    const encrypted = getFinalStep(steps, 'AES encryption');
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
  return getFinalStep(encryptAesWithSteps(block, roundKeys), 'AES encryption');
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

function getFinalStep(steps: Uint8Array[], label: string): Uint8Array {
  const finalStep = steps.at(-1);
  if (!finalStep) {
    throw new BadRequestException(`${label} produced no steps`);
  }

  return finalStep;
}
