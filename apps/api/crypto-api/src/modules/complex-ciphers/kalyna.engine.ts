import { BadRequestException } from '@nestjs/common';
import { AesMode, BinaryEncoding } from './complex-ciphers.types';
import {
  getKalynaParams,
  KALYNA_MDS_INV_MATRIX,
  KALYNA_MDS_MATRIX,
  KALYNA_SBOXES_DEC,
  KALYNA_SBOXES_ENC,
} from './kalyna.constants';
import { galoisMul } from './kalyna.galois';

const UINT64_MASK = 0xffffffffffffffffn;
const KALYNA_DEFAULT_STEP_SAMPLE_SIZE = 50_000;

export interface KalynaOptions {
  mode?: AesMode;
  iv?: Uint8Array;
  blockSizeBits: number;
}

export interface KalynaCorpusSampledStepsResult {
  ciphertext: Uint8Array;
  steps: Uint8Array[];
  sampleSize: number;
  totalBytes: number;
}

interface KalynaContext {
  nb: number;
  nk: number;
  nr: number;
  blockBytes: number;
  blockSizeBits: number;
  roundKeys: bigint[][];
}

export { parseBytes, formatBytes } from './aes.engine';

/** DSTU additive whitening mod 2^Nb — NOT XOR. */
export function addBlocksMod(
  left: Uint8Array,
  right: Uint8Array,
  blockSizeBits: number,
): Uint8Array {
  assertSameBlockLength(left, right);
  const modulus = 1n << BigInt(blockSizeBits);
  const sum =
    (bytesToBigIntLe(left) + bytesToBigIntLe(right)) % modulus;
  return bigIntToBytesLe(sum, left.length);
}

/** Inverse of additive whitening mod 2^Nb. */
export function subBlocksMod(
  left: Uint8Array,
  right: Uint8Array,
  blockSizeBits: number,
): Uint8Array {
  assertSameBlockLength(left, right);
  const modulus = 1n << BigInt(blockSizeBits);
  const diff =
    (bytesToBigIntLe(left) - bytesToBigIntLe(right) + modulus) % modulus;
  return bigIntToBytesLe(diff, left.length);
}

export function encryptKalyna(
  plaintext: Uint8Array,
  key: Uint8Array,
  options: KalynaOptions,
): { ciphertext: Uint8Array; iv?: Uint8Array } {
  const ctx = createContext(key, options.blockSizeBits);
  const mode = options.mode ?? AesMode.CBC;
  const padded = addPkcs7Padding(plaintext, ctx.blockBytes);
  const iv = getIv(mode, options.iv, ctx.blockBytes);
  let previous = iv;
  const output: number[] = [];

  for (let offset = 0; offset < padded.length; offset += ctx.blockBytes) {
    let block = padded.slice(offset, offset + ctx.blockBytes);
    if (mode === AesMode.CBC) {
      // DSTU additive whitening mod 2^Nb — NOT XOR
      block = Uint8Array.from(
        addBlocksMod(block, previous, ctx.blockSizeBits),
      );
    }

    const encrypted = encipherBlock(block, ctx);
    output.push(...encrypted);
    previous = encrypted;
  }

  return {
    ciphertext: Uint8Array.from(output),
    iv: mode === AesMode.CBC ? iv : undefined,
  };
}

export function decryptKalyna(
  ciphertext: Uint8Array,
  key: Uint8Array,
  options: KalynaOptions,
): { plaintext: Uint8Array; iv?: Uint8Array } {
  const ctx = createContext(key, options.blockSizeBits);
  const mode = options.mode ?? AesMode.CBC;
  if (ciphertext.length === 0 || ciphertext.length % ctx.blockBytes !== 0) {
    throw new BadRequestException(
      `Ciphertext length must be a multiple of ${ctx.blockBytes} bytes`,
    );
  }

  const iv = getIv(mode, options.iv, ctx.blockBytes);
  let previous = iv;
  const output: number[] = [];

  for (let offset = 0; offset < ciphertext.length; offset += ctx.blockBytes) {
    const block = ciphertext.slice(offset, offset + ctx.blockBytes);
    let decrypted = decipherBlock(block, ctx);
    if (mode === AesMode.CBC) {
      decrypted = subBlocksMod(decrypted, previous, ctx.blockSizeBits);
    }

    output.push(...decrypted);
    previous = block;
  }

  return {
    plaintext: removePkcs7Padding(Uint8Array.from(output), ctx.blockBytes),
  };
}

export function encryptKalynaBlock(
  block: Uint8Array,
  key: Uint8Array,
  blockSizeBits: number,
): Uint8Array {
  return encipherBlock(block, createContext(key, blockSizeBits));
}

export function decryptKalynaBlock(
  block: Uint8Array,
  key: Uint8Array,
  blockSizeBits: number,
): Uint8Array {
  return decipherBlock(block, createContext(key, blockSizeBits));
}

export function encryptKalynaWithSteps(
  block: Uint8Array,
  key: Uint8Array,
  blockSizeBits: number,
): Uint8Array[] {
  const ctx = createContext(key, blockSizeBits);
  assertBlock(block, ctx.blockBytes);
  const steps: Uint8Array[] = [];
  const state = bytesToWords(block, ctx.nb);

  addRoundKey(state, ctx.roundKeys[0]);
  steps.push(wordsToBytes(state, ctx.nb));

  for (let round = 1; round < ctx.nr; round += 1) {
    encipherRound(state, ctx.nb);
    xorRoundKey(state, ctx.roundKeys[round]);
    steps.push(wordsToBytes(state, ctx.nb));
  }

  encipherRound(state, ctx.nb);
  addRoundKey(state, ctx.roundKeys[ctx.nr]);
  steps.push(wordsToBytes(state, ctx.nb));

  return steps;
}

export function encryptKalynaCorpusWithSampledSteps(
  plaintext: Uint8Array,
  key: Uint8Array,
  options: KalynaOptions,
  maxSampleSize = KALYNA_DEFAULT_STEP_SAMPLE_SIZE,
): KalynaCorpusSampledStepsResult {
  const ctx = createContext(key, options.blockSizeBits);
  const mode = options.mode ?? AesMode.CBC;
  const padded = addPkcs7Padding(plaintext, ctx.blockBytes);
  const samplePlan = createSamplePlan(padded.length, maxSampleSize);
  const stepSamples: number[][] = Array.from(
    { length: ctx.nr + 1 },
    () => [],
  );
  const ciphertext: number[] = [];
  const iv = getIv(mode, options.iv, ctx.blockBytes);
  let previous = iv;

  for (let offset = 0; offset < padded.length; offset += ctx.blockBytes) {
    let block = padded.slice(offset, offset + ctx.blockBytes);
    if (mode === AesMode.CBC) {
      block = Uint8Array.from(
        addBlocksMod(block, previous, ctx.blockSizeBits),
      );
    }

    const steps = collectEncryptSteps(block, ctx);
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

function encipherBlock(block: Uint8Array, ctx: KalynaContext): Uint8Array {
  return collectEncryptSteps(block, ctx).at(-1) as Uint8Array;
}

function decipherBlock(block: Uint8Array, ctx: KalynaContext): Uint8Array {
  assertBlock(block, ctx.blockBytes);
  const state = bytesToWords(block, ctx.nb);

  subRoundKey(state, ctx.roundKeys[ctx.nr]);
  for (let round = ctx.nr - 1; round > 0; round -= 1) {
    decipherRound(state, ctx.nb);
    xorRoundKey(state, ctx.roundKeys[round]);
  }
  decipherRound(state, ctx.nb);
  subRoundKey(state, ctx.roundKeys[0]);

  return wordsToBytes(state, ctx.nb);
}

function collectEncryptSteps(
  block: Uint8Array,
  ctx: KalynaContext,
): Uint8Array[] {
  assertBlock(block, ctx.blockBytes);
  const steps: Uint8Array[] = [];
  const state = bytesToWords(block, ctx.nb);

  addRoundKey(state, ctx.roundKeys[0]);
  steps.push(wordsToBytes(state, ctx.nb));

  for (let round = 1; round < ctx.nr; round += 1) {
    encipherRound(state, ctx.nb);
    xorRoundKey(state, ctx.roundKeys[round]);
    steps.push(wordsToBytes(state, ctx.nb));
  }

  encipherRound(state, ctx.nb);
  addRoundKey(state, ctx.roundKeys[ctx.nr]);
  steps.push(wordsToBytes(state, ctx.nb));

  return steps;
}

function createContext(key: Uint8Array, blockSizeBits: number): KalynaContext {
  const keySizeBits = key.length * 8;
  let nb: number;
  let nk: number;
  let nr: number;
  let blockBytes: number;
  try {
    ({ nb, nk, nr, blockBytes } = getKalynaParams(blockSizeBits, keySizeBits));
  } catch {
    throw new BadRequestException('Invalid Kalyna block or key size');
  }
  if (key.length !== (keySizeBits / 8)) {
    throw new BadRequestException('Invalid Kalyna key length');
  }

  const roundKeys = expandKey(key, nb, nk, nr);
  return { nb, nk, nr, blockBytes, blockSizeBits, roundKeys };
}

function expandKey(
  key: Uint8Array,
  nb: number,
  nk: number,
  nr: number,
): bigint[][] {
  const roundKeys: bigint[][] = Array.from({ length: nr + 1 }, () =>
    new Array(nb).fill(0n),
  );
  const keyWords = bytesToWords(key, nk);
  const kt = keyExpandKt(keyWords, nb, nk);
  keyExpandEven(keyWords, kt, nb, nk, nr, roundKeys);
  keyExpandOdd(roundKeys, nb, nr);
  return roundKeys;
}

function keyExpandKt(
  keyWords: bigint[],
  nb: number,
  nk: number,
): bigint[] {
  const state = new Array(nb).fill(0n);
  state[0] = (state[0] + BigInt(nb + nk + 1)) & UINT64_MASK;

  const k0 = keyWords.slice(0, nb);
  const k1 = nk === nb ? keyWords.slice() : keyWords.slice(nb, nb * 2);

  addRoundKeyExpand(state, k0);
  encipherRound(state, nb);
  xorRoundKeyExpand(state, k1);
  encipherRound(state, nb);
  addRoundKeyExpand(state, k0);
  encipherRound(state, nb);

  return state.slice();
}

function keyExpandEven(
  keyWords: bigint[],
  kt: bigint[],
  nb: number,
  nk: number,
  nr: number,
  roundKeys: bigint[][],
): void {
  const initialData = keyWords.slice();
  const tmv = new Array(nb).fill(0x0001000100010001n);
  let round = 0;

  while (true) {
    const state = kt.slice();
    addRoundKeyExpand(state, tmv);
    const ktRound = state.slice();

    const blockState = initialData.slice(0, nb);
    addRoundKeyExpand(blockState, ktRound);
    encipherRound(blockState, nb);
    xorRoundKeyExpand(blockState, ktRound);
    encipherRound(blockState, nb);
    addRoundKeyExpand(blockState, ktRound);
    roundKeys[round] = blockState.slice();

    if (round === nr) {
      break;
    }

    if (nk !== nb) {
      round += 2;
      shiftLeftWords(tmv, nb);

      const state2 = kt.slice();
      addRoundKeyExpand(state2, tmv);
      const ktRound2 = state2.slice();

      const blockState2 = initialData.slice(nb, nb * 2);
      addRoundKeyExpand(blockState2, ktRound2);
      encipherRound(blockState2, nb);
      xorRoundKeyExpand(blockState2, ktRound2);
      encipherRound(blockState2, nb);
      addRoundKeyExpand(blockState2, ktRound2);
      roundKeys[round] = blockState2.slice();

      if (round === nr) {
        break;
      }
    }

    round += 2;
    shiftLeftWords(tmv, nb);
    rotateWords(initialData);
  }
}

function keyExpandOdd(
  roundKeys: bigint[][],
  nb: number,
  nr: number,
): void {
  for (let i = 1; i < nr; i += 2) {
    roundKeys[i] = roundKeys[i - 1].slice();
    rotateLeftBytes(roundKeys[i], nb);
  }
}

function encipherRound(state: bigint[], nb: number): void {
  subBytes(state, nb, KALYNA_SBOXES_ENC);
  shiftRows(state, nb);
  mixColumns(state, nb, KALYNA_MDS_MATRIX);
}

function decipherRound(state: bigint[], nb: number): void {
  mixColumns(state, nb, KALYNA_MDS_INV_MATRIX);
  invShiftRows(state, nb);
  subBytes(state, nb, KALYNA_SBOXES_DEC);
}

function subBytes(state: bigint[], nb: number, sboxes: number[][]): void {
  for (let i = 0; i < nb; i += 1) {
    const word = state[i];
    state[i] =
      BigInt(sboxes[0][Number(word & 0xffn)]) |
      (BigInt(sboxes[1][Number((word >> 8n) & 0xffn)]) << 8n) |
      (BigInt(sboxes[2][Number((word >> 16n) & 0xffn)]) << 16n) |
      (BigInt(sboxes[3][Number((word >> 24n) & 0xffn)]) << 24n) |
      (BigInt(sboxes[0][Number((word >> 32n) & 0xffn)]) << 32n) |
      (BigInt(sboxes[1][Number((word >> 40n) & 0xffn)]) << 40n) |
      (BigInt(sboxes[2][Number((word >> 48n) & 0xffn)]) << 48n) |
      (BigInt(sboxes[3][Number((word >> 56n) & 0xffn)]) << 56n);
  }
}

function shiftRows(state: bigint[], nb: number): void {
  const bytes = wordsToByteMatrix(state, nb);
  const next = new Uint8Array(bytes.length);
  let shift = -1;

  for (let row = 0; row < 8; row += 1) {
    if (row % (8 / nb) === 0) {
      shift += 1;
    }
    for (let col = 0; col < nb; col += 1) {
      next[row + ((col + shift) % nb) * 8] = bytes[row + col * 8];
    }
  }

  applyByteMatrix(state, next, nb);
}

function invShiftRows(state: bigint[], nb: number): void {
  const bytes = wordsToByteMatrix(state, nb);
  const next = new Uint8Array(bytes.length);
  let shift = -1;

  for (let row = 0; row < 8; row += 1) {
    if (row % (8 / nb) === 0) {
      shift += 1;
    }
    for (let col = 0; col < nb; col += 1) {
      next[row + col * 8] = bytes[row + ((col + shift) % nb) * 8];
    }
  }

  applyByteMatrix(state, next, nb);
}

function mixColumns(state: bigint[], nb: number, matrix: number[][]): void {
  const bytes = wordsToByteMatrix(state, nb);

  for (let col = 0; col < nb; col += 1) {
    let result = 0n;
    for (let row = 7; row >= 0; row -= 1) {
      let product = 0;
      for (let b = 7; b >= 0; b -= 1) {
        product ^= galoisMul(bytes[b + col * 8], matrix[row][b]);
      }
      result |= BigInt(product) << BigInt(row * 8);
    }
    state[col] = result & UINT64_MASK;
  }
}

function addRoundKey(state: bigint[], roundKey: bigint[]): void {
  for (let i = 0; i < state.length; i += 1) {
    state[i] = (state[i] + roundKey[i]) & UINT64_MASK;
  }
}

function subRoundKey(state: bigint[], roundKey: bigint[]): void {
  for (let i = 0; i < state.length; i += 1) {
    state[i] = (state[i] - roundKey[i] + UINT64_MASK + 1n) & UINT64_MASK;
  }
}

function addRoundKeyExpand(state: bigint[], value: bigint[]): void {
  for (let i = 0; i < state.length; i += 1) {
    state[i] = (state[i] + value[i]) & UINT64_MASK;
  }
}

function xorRoundKey(state: bigint[], roundKey: bigint[]): void {
  for (let i = 0; i < state.length; i += 1) {
    state[i] = state[i] ^ roundKey[i];
  }
}

function xorRoundKeyExpand(state: bigint[], value: bigint[]): void {
  for (let i = 0; i < state.length; i += 1) {
    state[i] = state[i] ^ value[i];
  }
}

function rotateWords(words: bigint[]): void {
  const temp = words[0];
  for (let i = 1; i < words.length; i += 1) {
    words[i - 1] = words[i];
  }
  words[words.length - 1] = temp;
}

function shiftLeftWords(words: bigint[], count: number): void {
  for (let i = 0; i < count; i += 1) {
    words[i] = (words[i] << 1n) & UINT64_MASK;
  }
}

function rotateLeftBytes(words: bigint[], nb: number): void {
  const rotateBytes = 2 * nb + 3;
  const bytes = wordsToByteMatrix(words, nb);
  const buffer = bytes.slice(0, rotateBytes);
  bytes.copyWithin(0, rotateBytes);
  bytes.set(buffer, bytes.length - rotateBytes);
  applyByteMatrix(words, bytes, nb);
}

function wordsToByteMatrix(words: bigint[], nb: number): Uint8Array {
  const bytes = new Uint8Array(nb * 8);
  for (let i = 0; i < nb; i += 1) {
    const word = words[i];
    for (let b = 0; b < 8; b += 1) {
      bytes[i * 8 + b] = Number((word >> BigInt(b * 8)) & 0xffn);
    }
  }
  return bytes;
}

function applyByteMatrix(words: bigint[], bytes: Uint8Array, nb: number): void {
  for (let i = 0; i < nb; i += 1) {
    let word = 0n;
    for (let b = 0; b < 8; b += 1) {
      word |= BigInt(bytes[i * 8 + b]) << BigInt(b * 8);
    }
    words[i] = word;
  }
}

function bytesToWords(bytes: Uint8Array, wordCount: number): bigint[] {
  const words = new Array(wordCount).fill(0n);
  for (let i = 0; i < wordCount; i += 1) {
    let word = 0n;
    for (let b = 0; b < 8; b += 1) {
      word |= BigInt(bytes[i * 8 + b] ?? 0) << BigInt(b * 8);
    }
    words[i] = word;
  }
  return words;
}

function wordsToBytes(words: bigint[], nb: number): Uint8Array {
  const bytes = new Uint8Array(nb * 8);
  for (let i = 0; i < nb; i += 1) {
    const word = words[i];
    for (let b = 0; b < 8; b += 1) {
      bytes[i * 8 + b] = Number((word >> BigInt(b * 8)) & 0xffn);
    }
  }
  return bytes;
}

function bytesToBigIntLe(bytes: Uint8Array): bigint {
  let value = 0n;
  for (let i = bytes.length - 1; i >= 0; i -= 1) {
    value = (value << 8n) | BigInt(bytes[i]);
  }
  return value;
}

function bigIntToBytesLe(value: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let current = value;
  for (let i = 0; i < length; i += 1) {
    bytes[i] = Number(current & 0xffn);
    current >>= 8n;
  }
  return bytes;
}

function addPkcs7Padding(bytes: Uint8Array, blockSize: number): Uint8Array {
  const remainder = bytes.length % blockSize;
  const paddingLength = remainder === 0 ? blockSize : blockSize - remainder;
  const result = new Uint8Array(bytes.length + paddingLength);
  result.set(bytes);
  result.fill(paddingLength, bytes.length);
  return result;
}

function removePkcs7Padding(bytes: Uint8Array, blockSize: number): Uint8Array {
  const paddingLength = bytes.at(-1) ?? 0;
  if (paddingLength < 1 || paddingLength > blockSize) {
    throw new BadRequestException('Invalid PKCS#7 padding');
  }

  const padding = bytes.slice(bytes.length - paddingLength);
  if (!padding.every((byte) => byte === paddingLength)) {
    throw new BadRequestException('Invalid PKCS#7 padding');
  }

  return bytes.slice(0, bytes.length - paddingLength);
}

function getIv(mode: AesMode, iv: Uint8Array | undefined, blockBytes: number): Uint8Array {
  if (mode === AesMode.ECB) {
    return new Uint8Array(blockBytes);
  }

  if (!iv) {
    throw new BadRequestException('CBC mode requires iv');
  }

  assertBlock(iv, blockBytes);
  return iv;
}

function assertBlock(block: Uint8Array, blockBytes: number): void {
  if (block.length !== blockBytes) {
    throw new BadRequestException(`Block must be ${blockBytes} bytes`);
  }
}

function assertSameBlockLength(left: Uint8Array, right: Uint8Array): void {
  if (left.length !== right.length) {
    throw new BadRequestException('Block lengths must match');
  }
}

function createSamplePlan(
  totalBytes: number,
  maxSampleSize: number,
): { size: number; totalBytes: number } {
  if (maxSampleSize < 1) {
    throw new BadRequestException('Kalyna step sample size must be positive');
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
