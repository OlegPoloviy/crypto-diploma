import { BadRequestException } from '@nestjs/common';
import { AesMode, BinaryEncoding } from './complex-ciphers.types';
import {
  DES_BLOCK_SIZE as BLOCK_SIZE,
  DES_DEFAULT_STEP_SAMPLE_SIZE as DEFAULT_DES_STEP_SAMPLE_SIZE,
  DES_EXPANSION_PERMUTATION as E,
  DES_FEISTEL_PERMUTATION as P,
  DES_FINAL_PERMUTATION as FP,
  DES_INITIAL_PERMUTATION as IP,
  DES_KEY_PERMUTED_CHOICE_1 as PC1,
  DES_KEY_PERMUTED_CHOICE_2 as PC2,
  DES_KEY_SHIFTS as SHIFTS,
  DES_S_BOXES as S_BOXES,
} from './des.constants';

interface DesOptions {
  mode?: AesMode;
  iv?: Uint8Array;
}

export interface DesCorpusSampledStepsResult {
  ciphertext: Uint8Array;
  steps: Uint8Array[];
  sampleSize: number;
  totalBytes: number;
}

export function encryptDes(
  plaintext: Uint8Array,
  key: Uint8Array,
  options: DesOptions = {},
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

export function decryptDes(
  ciphertext: Uint8Array,
  key: Uint8Array,
  options: DesOptions = {},
): { plaintext: Uint8Array; iv?: Uint8Array } {
  const mode = options.mode ?? AesMode.CBC;
  if (ciphertext.length === 0 || ciphertext.length % BLOCK_SIZE !== 0) {
    throw new BadRequestException(
      'Ciphertext length must be a multiple of 8 bytes',
    );
  }

  const roundKeys = expandKey(key);
  const iv = getIv(mode, options.iv);
  let previous = iv;
  const output: number[] = [];

  for (let offset = 0; offset < ciphertext.length; offset += BLOCK_SIZE) {
    const block = ciphertext.slice(offset, offset + BLOCK_SIZE);
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

export function encryptDesCorpusWithSteps(
  plaintext: Uint8Array,
  key: Uint8Array,
  options: DesOptions = {},
): Uint8Array[] {
  const mode = options.mode ?? AesMode.CBC;
  const roundKeys = expandKey(key);
  const roundBuffers: number[][] = Array.from({ length: 16 }, () => []);
  const padded = addPkcs7Padding(plaintext);
  const iv = getIv(mode, options.iv);
  let previous = iv;

  for (let offset = 0; offset < padded.length; offset += BLOCK_SIZE) {
    let block: Uint8Array = padded.slice(offset, offset + BLOCK_SIZE);
    if (mode === AesMode.CBC) {
      block = xorBlocks(block, previous);
    }

    const steps = encryptDesWithSteps(block, roundKeys);
    const encrypted = getFinalStep(steps, 'DES encryption');
    steps.forEach((step, index) => roundBuffers[index].push(...step));
    previous = encrypted;
  }

  return roundBuffers.map((buffer) => Uint8Array.from(buffer));
}

export function encryptDesCorpusWithSampledSteps(
  plaintext: Uint8Array,
  key: Uint8Array,
  options: DesOptions = {},
  maxSampleSize = DEFAULT_DES_STEP_SAMPLE_SIZE,
): DesCorpusSampledStepsResult {
  const mode = options.mode ?? AesMode.CBC;
  const roundKeys = expandKey(key);
  const padded = addPkcs7Padding(plaintext);
  const samplePlan = createSamplePlan(padded.length, maxSampleSize);
  const stepSamples: number[][] = Array.from({ length: 16 }, () => []);
  const ciphertext: number[] = [];
  const iv = getIv(mode, options.iv);
  let previous = iv;

  for (let offset = 0; offset < padded.length; offset += BLOCK_SIZE) {
    let block: Uint8Array = padded.slice(offset, offset + BLOCK_SIZE);
    if (mode === AesMode.CBC) {
      block = xorBlocks(block, previous);
    }

    const shouldCollectSteps = shouldCollectStepSample(
      stepSamples[0].length,
      offset,
      samplePlan,
    );
    const steps = shouldCollectSteps
      ? encryptDesWithSteps(block, roundKeys)
      : null;
    const encrypted = steps
      ? getFinalStep(steps, 'DES encryption')
      : encryptBlock(block, roundKeys);

    steps?.forEach((step, stepIndex) => {
      collectStepSample(stepSamples[stepIndex], step, offset, samplePlan);
    });

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

export function encryptDesBlock(
  block: Uint8Array,
  key: Uint8Array,
): Uint8Array {
  assertBlock(block, 'Plaintext block');
  return encryptBlock(block, expandKey(key));
}

export function decryptDesBlock(
  block: Uint8Array,
  key: Uint8Array,
): Uint8Array {
  assertBlock(block, 'Ciphertext block');
  return decryptBlock(block, expandKey(key));
}

export function encryptDesWithSteps(
  block: Uint8Array,
  roundKeys: Uint8Array[],
): Uint8Array[];
export function encryptDesWithSteps(
  block: Uint8Array,
  key: Uint8Array,
): Uint8Array[];
export function encryptDesWithSteps(
  block: Uint8Array,
  keyOrRoundKeys: Uint8Array | Uint8Array[],
): Uint8Array[] {
  assertBlock(block, 'Plaintext block');
  const roundKeys = Array.isArray(keyOrRoundKeys)
    ? keyOrRoundKeys
    : expandKey(keyOrRoundKeys);
  assertRoundKeys(roundKeys);

  return runBlock(block, roundKeys, true).steps;
}

function encryptBlock(block: Uint8Array, roundKeys: Uint8Array[]): Uint8Array {
  return runBlock(block, roundKeys, true, false).output;
}

function decryptBlock(block: Uint8Array, roundKeys: Uint8Array[]): Uint8Array {
  return runBlock(block, roundKeys, false, false).output;
}

function runBlock(
  block: Uint8Array,
  roundKeys: Uint8Array[],
  encrypt: boolean,
  collectSteps = true,
): { output: Uint8Array; steps: Uint8Array[] } {
  const bits = permute(bytesToBits(block), IP);
  let left = bits.slice(0, 32);
  let right = bits.slice(32);
  const keys = encrypt ? roundKeys : [...roundKeys].reverse();
  const steps: Uint8Array[] = [];
  let output: Uint8Array | null = null;

  for (const roundKey of keys) {
    const nextLeft = right;
    const nextRight = xorBits(left, feistel(right, roundKey));
    left = nextLeft;
    right = nextRight;
    output = bitsToBytes(permute([...right, ...left], FP));
    if (collectSteps) {
      steps.push(output);
    }
  }

  if (!output) {
    throw new BadRequestException('DES block processing produced no output');
  }

  return { output, steps };
}

function feistel(right: number[], roundKey: Uint8Array): number[] {
  const expanded = permute(right, E);
  const mixed = xorBits(expanded, Array.from(roundKey));
  const substituted: number[] = [];

  for (let box = 0; box < 8; box += 1) {
    const chunk = mixed.slice(box * 6, box * 6 + 6);
    const row = (chunk[0] << 1) | chunk[5];
    const column =
      (chunk[1] << 3) | (chunk[2] << 2) | (chunk[3] << 1) | chunk[4];
    const value = S_BOXES[box][row * 16 + column];
    substituted.push(...numberToBits(value, 4));
  }

  return permute(substituted, P);
}

function expandKey(key: Uint8Array): Uint8Array[] {
  assertKey(key);
  const keyBits = permute(bytesToBits(key), PC1);
  let left = keyBits.slice(0, 28);
  let right = keyBits.slice(28);

  return SHIFTS.map((shift) => {
    left = rotateLeft(left, shift);
    right = rotateLeft(right, shift);
    return Uint8Array.from(permute([...left, ...right], PC2));
  });
}

function bytesToBits(bytes: Uint8Array): number[] {
  return Array.from(bytes).flatMap((byte) => numberToBits(byte, 8));
}

function bitsToBytes(bits: number[]): Uint8Array {
  const bytes: number[] = [];
  for (let offset = 0; offset < bits.length; offset += 8) {
    bytes.push(bitsToNumber(bits.slice(offset, offset + 8)));
  }

  return Uint8Array.from(bytes);
}

function numberToBits(value: number, width: number): number[] {
  return Array.from(
    { length: width },
    (_, index) => (value >> (width - 1 - index)) & 1,
  );
}

function bitsToNumber(bits: number[]): number {
  return bits.reduce((value, bit) => (value << 1) | bit, 0);
}

function permute(bits: number[], table: number[]): number[] {
  return table.map((position) => bits[position - 1]);
}

function rotateLeft(bits: number[], shift: number): number[] {
  return [...bits.slice(shift), ...bits.slice(0, shift)];
}

function xorBits(left: number[], right: number[]): number[] {
  return left.map((bit, index) => bit ^ right[index]);
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
    throw new BadRequestException(`${label} must be 8 bytes`);
  }
}

function assertKey(key: Uint8Array): void {
  if (key.length !== BLOCK_SIZE) {
    throw new BadRequestException('DES key must be 8 bytes');
  }
}

function assertRoundKeys(roundKeys: Uint8Array[]): void {
  if (roundKeys.length !== 16) {
    throw new BadRequestException('DES round keys must include 16 rounds');
  }

  roundKeys.forEach((roundKey, index) => {
    if (roundKey.length !== 48) {
      throw new BadRequestException(`DES round key ${index} must be 48 bits`);
    }
  });
}

function createSamplePlan(
  totalBytes: number,
  maxSampleSize: number,
): { size: number; totalBytes: number } {
  if (maxSampleSize < 1) {
    throw new BadRequestException('DES step sample size must be positive');
  }

  if (totalBytes <= maxSampleSize) {
    return { size: totalBytes, totalBytes };
  }

  return { size: maxSampleSize, totalBytes };
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

function shouldCollectStepSample(
  sampleLength: number,
  blockOffset: number,
  samplePlan: { size: number; totalBytes: number },
): boolean {
  if (sampleLength >= samplePlan.size) {
    return false;
  }

  const nextTarget = Math.floor(
    (sampleLength * samplePlan.totalBytes) / samplePlan.size,
  );

  return nextTarget < blockOffset + BLOCK_SIZE;
}

function getFinalStep(steps: Uint8Array[], label: string): Uint8Array {
  const finalStep = steps.at(-1);
  if (!finalStep) {
    throw new BadRequestException(`${label} produced no steps`);
  }

  return finalStep;
}
