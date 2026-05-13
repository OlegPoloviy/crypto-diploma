import { BadRequestException } from '@nestjs/common';
import {
  calculateByteMetrics,
  calculateTextMetrics,
} from './classical-ciphers.metrics';
import {
  CipherMetricKey,
  CipherMetricStatDto,
} from './dto/cipher-metric-stat.dto';
import { CipherResponseDto } from './dto/cipher-response.dto';
import { CipherStepResponseDto } from './dto/cipher-step-response.dto';
import {
  ClassicalCipherAlgorithm,
  ClassicalCipherParameters,
} from './classical-ciphers.types';

const DEFAULT_CAESAR_JOB_MAX_STEPS = 40;
const MAX_STORED_STEP_TEXT_LENGTH = 8000;

const METRIC_DESCRIPTORS: Array<{ key: CipherMetricKey; label: string }> = [
  { key: 'hurstExponent', label: 'Hurst' },
  { key: 'dfaAlpha', label: 'DFA' },
  { key: 'wordFrequencyEntropy', label: 'Entropy' },
];

interface Alphabet {
  lower: string;
  upper: string;
}

const ALPHABETS: Alphabet[] = [
  {
    lower: 'abcdefghijklmnopqrstuvwxyz',
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  },
  {
    lower:
      '\u0430\u0431\u0432\u0433\u0491\u0434\u0435\u0454\u0436\u0437\u0438\u0456\u0457\u0439\u043a\u043b\u043c\u043d\u043e\u043f\u0440\u0441\u0442\u0443\u0444\u0445\u0446\u0447\u0448\u0449\u044c\u044e\u044f',
    upper:
      '\u0410\u0411\u0412\u0413\u0490\u0414\u0415\u0404\u0416\u0417\u0418\u0406\u0407\u0419\u041a\u041b\u041c\u041d\u041e\u041F\u0420\u0421\u0422\u0423\u0424\u0425\u0426\u0427\u0428\u0429\u042C\u042E\u042F',
  },
];

export function runClassicalCipher(
  text: string,
  algorithm: ClassicalCipherAlgorithm,
  parameters: ClassicalCipherParameters,
): CipherResponseDto {
  if (getInputEncoding(parameters) === 'hex') {
    return runClassicalByteCipher(text, algorithm, parameters);
  }

  switch (algorithm) {
    case ClassicalCipherAlgorithm.CAESAR:
      return encryptCaesarCheckpoints(
        text,
        getShift(parameters),
        getMaxSteps(parameters),
      );
    case ClassicalCipherAlgorithm.VIGENERE_KEY_SYMBOLS:
      return encryptVigenereByKeySymbols(text, getKey(parameters));
    case ClassicalCipherAlgorithm.VIGENERE_KEY_LENGTHS:
      return encryptVigenereByKeyLengths(
        text,
        getKey(parameters),
        'keyLengths' in parameters ? parameters.keyLengths : undefined,
      );
    default:
      throw new BadRequestException('Unsupported classical cipher algorithm');
  }
}

function runClassicalByteCipher(
  text: string,
  algorithm: ClassicalCipherAlgorithm,
  parameters: ClassicalCipherParameters,
): CipherResponseDto {
  const bytes = parseHexBytes(text);

  switch (algorithm) {
    case ClassicalCipherAlgorithm.CAESAR:
      return encryptCaesarBytes(
        bytes,
        getShift(parameters),
        getMaxSteps(parameters),
      );
    case ClassicalCipherAlgorithm.VIGENERE_KEY_SYMBOLS:
      return encryptVigenereBytesByKeySymbols(bytes, getKey(parameters));
    case ClassicalCipherAlgorithm.VIGENERE_KEY_LENGTHS:
      return encryptVigenereBytesByKeyLengths(
        bytes,
        getKey(parameters),
        'keyLengths' in parameters ? parameters.keyLengths : undefined,
      );
    default:
      throw new BadRequestException('Unsupported classical cipher algorithm');
  }
}

function encryptCaesarBytes(
  bytes: Uint8Array,
  shift: number,
  maxSteps = DEFAULT_CAESAR_JOB_MAX_STEPS,
): CipherResponseDto {
  assertBytes(bytes);

  const safeMaxSteps = Math.max(1, Math.min(maxSteps, 500));
  const checkpointEvery = Math.max(1, Math.ceil(bytes.length / safeMaxSteps));
  const output = bytes.slice();
  const steps: CipherStepResponseDto[] = [];

  for (let index = 0; index < output.length; index += 1) {
    output[index] = modulo(output[index] + shift, 256);

    const processedBytes = index + 1;
    const shouldCapture =
      processedBytes === output.length ||
      processedBytes % checkpointEvery === 0;

    if (shouldCapture) {
      const state = output.slice();
      state.set(bytes.slice(processedBytes), processedBytes);
      steps.push(
        createByteStep(
          steps.length + 1,
          `Encrypted ${processedBytes} of ${bytes.length} bytes`,
          state,
          MAX_STORED_STEP_TEXT_LENGTH,
        ),
      );
    }
  }

  return {
    finalText: Buffer.from(output).toString('hex'),
    steps,
    metricStats: calculateStepMetricStats(steps),
  };
}

function encryptVigenereBytesByKeySymbols(
  bytes: Uint8Array,
  key: string,
): CipherResponseDto {
  assertBytes(bytes);
  const keyBytes = normalizeByteKey(key);
  const steps = Array.from(keyBytes).map((keyByte, index) =>
    createByteStep(
      index + 1,
      `Applied key byte 0x${keyByte.toString(16).padStart(2, '0')} (${index + 1} of ${keyBytes.length})`,
      encryptVigenereBytesPartial(bytes, keyBytes, index),
    ),
  );

  return {
    finalText: Buffer.from(encryptVigenereBytesFull(bytes, keyBytes)).toString(
      'hex',
    ),
    steps,
    metricStats: calculateStepMetricStats(steps),
  };
}

function encryptVigenereBytesByKeyLengths(
  bytes: Uint8Array,
  key: string,
  keyLengths = [1, 3, 5, 10, 20],
): CipherResponseDto {
  assertBytes(bytes);
  const keyBytes = normalizeByteKey(key);
  const uniqueLengths = Array.from(new Set(keyLengths)).sort((a, b) => a - b);
  const steps = uniqueLengths.map((length, index) =>
    createByteStep(
      index + 1,
      `Encrypted with key length ${length}`,
      encryptVigenereBytesFull(bytes, expandByteKey(keyBytes, length)),
      undefined,
      { keyLength: length },
    ),
  );

  return {
    finalText: Buffer.from(
      encryptVigenereBytesFull(
        bytes,
        expandByteKey(keyBytes, uniqueLengths.at(-1) ?? keyBytes.length),
      ),
    ).toString('hex'),
    steps,
    metricStats: calculateStepMetricStats(steps),
  };
}

export function encryptCaesar(text: string, shift: number): CipherResponseDto {
  assertText(text);

  const matches = Array.from(text.matchAll(/\S+/g));
  const steps: CipherStepResponseDto[] = [];
  let currentText = text;

  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    const word = match[0];
    const encryptedWord = shiftText(word, shift);
    currentText =
      currentText.slice(0, start) +
      encryptedWord +
      currentText.slice(start + word.length);
    steps.push(
      createStep(
        index + 1,
        `Encrypted word '${word}' (${index + 1} of ${matches.length})`,
        currentText,
      ),
    );
  });

  return {
    finalText: currentText,
    steps,
    metricStats: calculateStepMetricStats(steps),
  };
}

export function encryptCaesarCheckpoints(
  text: string,
  shift: number,
  maxSteps = DEFAULT_CAESAR_JOB_MAX_STEPS,
): CipherResponseDto {
  assertText(text);

  const totalWords = countWords(text);
  if (totalWords === 0) {
    const steps = [createStep(1, 'No words to encrypt', text)];

    return {
      finalText: text,
      steps,
      metricStats: calculateStepMetricStats(steps),
    };
  }

  const safeMaxSteps = Math.max(1, Math.min(maxSteps, 500));
  const checkpointEvery = Math.max(1, Math.ceil(totalWords / safeMaxSteps));
  const steps: CipherStepResponseDto[] = [];
  const parts: string[] = [];
  let lastIndex = 0;
  let encryptedWords = 0;

  for (const match of text.matchAll(/\S+/g)) {
    const start = match.index ?? 0;
    const word = match[0];

    parts.push(text.slice(lastIndex, start), shiftText(word, shift));
    lastIndex = start + word.length;
    encryptedWords += 1;

    const shouldCapture =
      encryptedWords === totalWords || encryptedWords % checkpointEvery === 0;

    if (shouldCapture) {
      const currentText = parts.join('') + text.slice(lastIndex);
      steps.push(
        createStep(
          steps.length + 1,
          `Encrypted ${encryptedWords} of ${totalWords} words`,
          currentText,
          MAX_STORED_STEP_TEXT_LENGTH,
        ),
      );
    }
  }

  const finalText = parts.join('') + text.slice(lastIndex);

  return {
    finalText,
    steps,
    metricStats: calculateStepMetricStats(steps),
  };
}

export function encryptVigenereByKeySymbols(
  text: string,
  key: string,
): CipherResponseDto {
  assertText(text);
  const keySymbols = normalizeKey(key);
  const steps = keySymbols.map((symbol, index) => {
    const encryptedText = encryptVigenerePartial(text, keySymbols, index);

    return createStep(
      index + 1,
      `Applied key symbol '${symbol.original}' (${index + 1} of ${keySymbols.length})`,
      encryptedText,
    );
  });

  return {
    finalText: steps.at(-1)?.text ?? text,
    steps,
    metricStats: calculateStepMetricStats(steps),
  };
}

export function encryptVigenereByKeyLengths(
  text: string,
  key: string,
  keyLengths = [1, 3, 5, 10, 20],
): CipherResponseDto {
  assertText(text);
  const normalizedKey = normalizeKey(key);
  const uniqueLengths = Array.from(new Set(keyLengths)).sort((a, b) => a - b);
  const steps = uniqueLengths.map((length, index) => {
    const effectiveKey = expandKey(normalizedKey, length);
    const encryptedText = encryptVigenereFull(text, effectiveKey);

    return createStep(
      index + 1,
      `Encrypted with key length ${length}`,
      encryptedText,
      undefined,
      { keyLength: length },
    );
  });

  return {
    finalText: steps.at(-1)?.text ?? text,
    steps,
    metricStats: calculateStepMetricStats(steps),
  };
}

function encryptVigenerePartial(
  text: string,
  key: KeySymbol[],
  maxKeyIndex: number,
): string {
  let letterIndex = 0;
  let result = '';

  for (const char of text) {
    const keyIndex = letterIndex % key.length;

    if (!findAlphabet(char)) {
      result += char;
      continue;
    }

    result +=
      keyIndex <= maxKeyIndex ? shiftText(char, key[keyIndex].shift) : char;
    letterIndex += 1;
  }

  return result;
}

function encryptVigenereFull(text: string, key: KeySymbol[]): string {
  let letterIndex = 0;
  let result = '';

  for (const char of text) {
    if (!findAlphabet(char)) {
      result += char;
      continue;
    }

    const keySymbol = key[letterIndex % key.length];
    result += shiftText(char, keySymbol.shift);
    letterIndex += 1;
  }

  return result;
}

function encryptVigenereBytesPartial(
  bytes: Uint8Array,
  key: Uint8Array,
  maxKeyIndex: number,
): Uint8Array {
  const output = bytes.slice();

  for (let index = 0; index < output.length; index += 1) {
    const keyIndex = index % key.length;
    if (keyIndex <= maxKeyIndex) {
      output[index] = modulo(output[index] + key[keyIndex], 256);
    }
  }

  return output;
}

function encryptVigenereBytesFull(
  bytes: Uint8Array,
  key: Uint8Array,
): Uint8Array {
  const output = bytes.slice();

  for (let index = 0; index < output.length; index += 1) {
    output[index] = modulo(output[index] + key[index % key.length], 256);
  }

  return output;
}

function normalizeByteKey(key: string): Uint8Array {
  const keyBytes = new TextEncoder().encode(key);
  if (keyBytes.length === 0) {
    throw new BadRequestException('Key must contain at least one byte');
  }

  return keyBytes;
}

function expandByteKey(key: Uint8Array, length: number): Uint8Array {
  return Uint8Array.from({ length }, (_, index) => key[index % key.length]);
}

function shiftText(text: string, shift: number): string {
  return Array.from(text)
    .map((char) => shiftChar(char, shift))
    .join('');
}

function shiftChar(char: string, shift: number): string {
  const alphabet = findAlphabet(char);
  if (!alphabet) {
    return char;
  }

  const isUpper = alphabet.upper.includes(char);
  const letters = isUpper ? alphabet.upper : alphabet.lower;
  const index = letters.indexOf(char);
  const shiftedIndex = modulo(index + shift, letters.length);

  return letters[shiftedIndex];
}

function normalizeKey(key: string): KeySymbol[] {
  const symbols = Array.from(key)
    .map((char) => {
      const alphabet = findAlphabet(char);
      if (!alphabet) {
        return null;
      }

      const lowerChar = char.toLocaleLowerCase();
      return {
        original: char,
        shift: alphabet.lower.indexOf(lowerChar),
      };
    })
    .filter((symbol): symbol is KeySymbol => symbol !== null);

  if (symbols.length === 0) {
    throw new BadRequestException('Key must contain at least one letter');
  }

  return symbols;
}

function expandKey(key: KeySymbol[], length: number): KeySymbol[] {
  return Array.from({ length }, (_, index) => key[index % key.length]);
}

function findAlphabet(char: string): Alphabet | undefined {
  return ALPHABETS.find(
    (alphabet) =>
      alphabet.lower.includes(char) || alphabet.upper.includes(char),
  );
}

function createStep(
  step: number,
  description: string,
  text: string,
  maxStoredTextLength?: number,
  metadata: Partial<Pick<CipherStepResponseDto, 'keyLength'>> = {},
): CipherStepResponseDto {
  return {
    step,
    description,
    ...metadata,
    text: maxStoredTextLength ? truncateText(text, maxStoredTextLength) : text,
    ...calculateTextMetrics(text),
  };
}

function createByteStep(
  step: number,
  description: string,
  bytes: Uint8Array,
  maxStoredTextLength?: number,
  metadata: Partial<Pick<CipherStepResponseDto, 'keyLength'>> = {},
): CipherStepResponseDto {
  const hex = Buffer.from(bytes).toString('hex');

  return {
    step,
    description,
    ...metadata,
    text: maxStoredTextLength ? truncateText(hex, maxStoredTextLength) : hex,
    ...calculateByteMetrics(bytes),
  };
}

function assertText(text: string): void {
  if (!text?.trim()) {
    throw new BadRequestException('Text cannot be empty');
  }
}

function assertBytes(bytes: Uint8Array): void {
  if (bytes.length === 0) {
    throw new BadRequestException('Binary content cannot be empty');
  }
}

function parseHexBytes(text: string): Uint8Array {
  if (!text || text.length % 2 !== 0 || !/^[\da-f]*$/i.test(text)) {
    throw new BadRequestException('Binary content must be valid hex');
  }

  return Uint8Array.from(Buffer.from(text, 'hex'));
}

function getShift(parameters: ClassicalCipherParameters): number {
  if ('shift' in parameters) {
    return parameters.shift;
  }

  throw new BadRequestException('Caesar cipher requires shift parameter');
}

function getMaxSteps(parameters: ClassicalCipherParameters): number {
  if ('shift' in parameters) {
    return parameters.maxSteps ?? DEFAULT_CAESAR_JOB_MAX_STEPS;
  }

  return DEFAULT_CAESAR_JOB_MAX_STEPS;
}

function getKey(parameters: ClassicalCipherParameters): string {
  if ('key' in parameters) {
    return parameters.key;
  }

  throw new BadRequestException('Vigenere cipher requires key parameter');
}

function getInputEncoding(
  parameters: ClassicalCipherParameters,
): 'utf8' | 'hex' {
  return parameters.inputEncoding ?? 'utf8';
}

interface KeySymbol {
  original: string;
  shift: number;
}

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function countWords(text: string): number {
  let count = 0;
  for (const match of text.matchAll(/\S+/g)) {
    void match;
    count += 1;
  }

  return count;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}\n... [truncated ${text.length - maxLength} chars]`;
}

function calculateStepMetricStats(
  steps: CipherStepResponseDto[],
): CipherMetricStatDto[] {
  if (steps.length === 0) {
    return [];
  }

  return METRIC_DESCRIPTORS.map((metric) => {
    const values = steps.map((step) => step[metric.key]);
    const mean = average(values);
    const variance =
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      values.length;

    return {
      key: metric.key,
      label: metric.label,
      final: roundMetric(values.at(-1) ?? 0),
      mean: roundMetric(mean),
      standardDeviation: roundMetric(Math.sqrt(variance)),
      min: roundMetric(Math.min(...values)),
      max: roundMetric(Math.max(...values)),
    };
  });
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundMetric(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 10000) / 10000;
}
