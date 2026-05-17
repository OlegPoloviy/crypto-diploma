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
  { key: 'wordHurstExponent', label: 'Word Hurst' },
  { key: 'wordDfaAlpha', label: 'Word DFA' },
  { key: 'wordEntropy', label: 'Word entropy' },
  { key: 'byteHurstExponent', label: 'Byte Hurst' },
  { key: 'byteDfaAlpha', label: 'Byte DFA' },
  { key: 'byteEntropy', label: 'Byte entropy' },
];

interface ClassicalWhiteningOptions {
  enabled?: boolean;
}

interface ByteMetricSnapshot {
  byteHurstExponent: number;
  byteDfaAlpha: number;
  byteEntropy: number;
  status: 'random-like' | 'structured';
}

interface WhiteningImpactMetadata {
  whiteningEnabled: boolean;
  whiteningImpact?: {
    formula: 'post-only' | 'pre-post';
    mode: 'text' | 'byte';
    withoutWhitening: ByteMetricSnapshot;
    withWhitening: ByteMetricSnapshot;
    delta: Omit<ByteMetricSnapshot, 'status'>;
    wordHurstExponent?: number;
    wordDfaAlpha?: number;
    wordEntropy?: number;
  };
}

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
        getClassicalWhiteningOptions(parameters),
      );
    case ClassicalCipherAlgorithm.VIGENERE_KEY_SYMBOLS:
      return encryptVigenereByKeySymbols(
        text,
        getKey(parameters),
        getClassicalWhiteningOptions(parameters),
      );
    case ClassicalCipherAlgorithm.VIGENERE_KEY_LENGTHS:
      return encryptVigenereByKeyLengths(
        text,
        getKey(parameters),
        'keyLengths' in parameters ? parameters.keyLengths : undefined,
        getClassicalWhiteningOptions(parameters),
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
        getClassicalWhiteningOptions(parameters),
      );
    case ClassicalCipherAlgorithm.VIGENERE_KEY_SYMBOLS:
      return encryptVigenereBytesByKeySymbols(
        bytes,
        getKey(parameters),
        getClassicalWhiteningOptions(parameters),
      );
    case ClassicalCipherAlgorithm.VIGENERE_KEY_LENGTHS:
      return encryptVigenereBytesByKeyLengths(
        bytes,
        getKey(parameters),
        'keyLengths' in parameters ? parameters.keyLengths : undefined,
        getClassicalWhiteningOptions(parameters),
      );
    default:
      throw new BadRequestException('Unsupported classical cipher algorithm');
  }
}

function encryptCaesarBytes(
  bytes: Uint8Array,
  shift: number,
  maxSteps = DEFAULT_CAESAR_JOB_MAX_STEPS,
  whitening: ClassicalWhiteningOptions = {},
): CipherResponseDto {
  assertBytes(bytes);

  const whiteningEnabled = whitening.enabled === true;
  const input = whiteningEnabled
    ? applyClassicalByteWhitening(bytes, caesarWhiteningSeed(shift, 'pre'))
    : bytes;
  const safeMaxSteps = Math.max(1, Math.min(maxSteps, 500));
  const checkpointEvery = Math.max(1, Math.ceil(input.length / safeMaxSteps));
  const output = input.slice();
  const steps: CipherStepResponseDto[] = [];

  if (whiteningEnabled) {
    steps.push(
      createByteStep(
        1,
        'Classical pre-whitening',
        input,
        MAX_STORED_STEP_TEXT_LENGTH,
      ),
    );
  }

  for (let index = 0; index < output.length; index += 1) {
    output[index] = modulo(output[index] + shift, 256);

    const processedBytes = index + 1;
    const shouldCapture =
      processedBytes === output.length ||
      processedBytes % checkpointEvery === 0;

    if (shouldCapture) {
      const state = output.slice();
      state.set(input.slice(processedBytes), processedBytes);
      steps.push(
        createByteStep(
          steps.length + 1,
          `Encrypted ${processedBytes} of ${input.length} bytes`,
          state,
          MAX_STORED_STEP_TEXT_LENGTH,
        ),
      );
    }
  }

  const finalBytes = whiteningEnabled
    ? applyClassicalByteWhitening(output, caesarWhiteningSeed(shift, 'post'))
    : output;
  if (whiteningEnabled) {
    steps.push(
      createByteStep(
        steps.length + 1,
        'Classical post-whitening',
        finalBytes,
        MAX_STORED_STEP_TEXT_LENGTH,
      ),
    );
  }

  return {
    finalText: Buffer.from(finalBytes).toString('hex'),
    steps,
    metricStats: calculateStepMetricStats(steps),
    metadata: createWhiteningMetadata({
      whiteningEnabled,
      beforeBytes: output,
      afterBytes: finalBytes,
      mode: 'byte',
      formula: 'pre-post',
    }),
  };
}

function encryptVigenereBytesByKeySymbols(
  bytes: Uint8Array,
  key: string,
  whitening: ClassicalWhiteningOptions = {},
): CipherResponseDto {
  assertBytes(bytes);
  const keyBytes = normalizeByteKey(key);
  const whiteningEnabled = whitening.enabled === true;
  const input = whiteningEnabled
    ? applyClassicalByteWhitening(bytes, keyWhiteningSeed(keyBytes, 'pre'))
    : bytes;
  const steps: CipherStepResponseDto[] = [];

  if (whiteningEnabled) {
    steps.push(createByteStep(1, 'Classical pre-whitening', input));
  }

  Array.from(keyBytes).forEach((keyByte, index) => {
    steps.push(
      createByteStep(
        steps.length + 1,
        `Applied key byte 0x${keyByte.toString(16).padStart(2, '0')} (${index + 1} of ${keyBytes.length})`,
        encryptVigenereBytesPartial(input, keyBytes, index),
      ),
    );
  });

  const encrypted = encryptVigenereBytesFull(input, keyBytes);
  const finalBytes = whiteningEnabled
    ? applyClassicalByteWhitening(encrypted, keyWhiteningSeed(keyBytes, 'post'))
    : encrypted;
  if (whiteningEnabled) {
    steps.push(
      createByteStep(steps.length + 1, 'Classical post-whitening', finalBytes),
    );
  }

  return {
    finalText: Buffer.from(finalBytes).toString(
      'hex',
    ),
    steps,
    metricStats: calculateStepMetricStats(steps),
    metadata: createWhiteningMetadata({
      whiteningEnabled,
      beforeBytes: encrypted,
      afterBytes: finalBytes,
      mode: 'byte',
      formula: 'pre-post',
    }),
  };
}

function encryptVigenereBytesByKeyLengths(
  bytes: Uint8Array,
  key: string,
  keyLengths = [1, 3, 5, 10, 20],
  whitening: ClassicalWhiteningOptions = {},
): CipherResponseDto {
  assertBytes(bytes);
  const keyBytes = normalizeByteKey(key);
  const whiteningEnabled = whitening.enabled === true;
  const input = whiteningEnabled
    ? applyClassicalByteWhitening(bytes, keyWhiteningSeed(keyBytes, 'pre'))
    : bytes;
  const uniqueLengths = Array.from(new Set(keyLengths)).sort((a, b) => a - b);
  const steps: CipherStepResponseDto[] = [];

  if (whiteningEnabled) {
    steps.push(createByteStep(1, 'Classical pre-whitening', input));
  }

  uniqueLengths.forEach((length) => {
    const encrypted = encryptVigenereBytesFull(
      input,
      expandByteKey(keyBytes, length),
    );
    const state = whiteningEnabled
      ? applyClassicalByteWhitening(encrypted, keyWhiteningSeed(keyBytes, 'post'))
      : encrypted;
    steps.push(
      createByteStep(
        steps.length + 1,
        `Encrypted with key length ${length}`,
        state,
        undefined,
        { keyLength: length },
      ),
    );
  });

  const encrypted = encryptVigenereBytesFull(
    input,
    expandByteKey(keyBytes, uniqueLengths.at(-1) ?? keyBytes.length),
  );
  const finalBytes = whiteningEnabled
    ? applyClassicalByteWhitening(encrypted, keyWhiteningSeed(keyBytes, 'post'))
    : encrypted;

  return {
    finalText: Buffer.from(finalBytes).toString('hex'),
    steps,
    metricStats: calculateStepMetricStats(steps),
    metadata: createWhiteningMetadata({
      whiteningEnabled,
      beforeBytes: encrypted,
      afterBytes: finalBytes,
      mode: 'byte',
      formula: 'pre-post',
    }),
  };
}

export function encryptCaesar(
  text: string,
  shift: number,
  whitening: ClassicalWhiteningOptions = {},
): CipherResponseDto {
  assertText(text);

  const whiteningEnabled = whitening.enabled === true;
  const input = text;
  const matches = Array.from(input.matchAll(/\S+/g));
  const steps: CipherStepResponseDto[] = [];
  let currentText = input;
  let wordMetricText = currentText;
  let postBytes: Uint8Array | undefined;

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
        steps.length + 1,
        `Encrypted word '${word}' (${index + 1} of ${matches.length})`,
        currentText,
      ),
    );
  });

  if (whiteningEnabled) {
    wordMetricText = currentText;
    postBytes = applyClassicalByteWhitening(
      textToRawBytes(currentText),
      caesarWhiteningSeed(shift, 'post'),
    );
    currentText = bytesToHex(postBytes);
    steps.push(
      createStep(
        steps.length + 1,
        'Classical byte post-whitening',
        currentText,
        undefined,
        {},
        postBytes,
        wordMetricText,
      ),
    );
  }

  return {
    finalText: currentText,
    steps,
    metricStats: calculateStepMetricStats(steps),
    metadata: createWhiteningMetadata({
      whiteningEnabled,
      beforeBytes: textToRawBytes(wordMetricText),
      afterBytes: postBytes,
      wordMetricText,
      mode: 'text',
      formula: 'post-only',
    }),
  };
}

export function encryptCaesarCheckpoints(
  text: string,
  shift: number,
  maxSteps = DEFAULT_CAESAR_JOB_MAX_STEPS,
  whitening: ClassicalWhiteningOptions = {},
): CipherResponseDto {
  assertText(text);

  const whiteningEnabled = whitening.enabled === true;
  const input = text;
  const totalWords = countWords(input);
  if (totalWords === 0) {
    const steps = [createStep(1, 'No words to encrypt', input)];

    return {
      finalText: input,
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

  for (const match of input.matchAll(/\S+/g)) {
    const start = match.index ?? 0;
    const word = match[0];

    parts.push(input.slice(lastIndex, start), shiftText(word, shift));
    lastIndex = start + word.length;
    encryptedWords += 1;

    const shouldCapture =
      encryptedWords === totalWords || encryptedWords % checkpointEvery === 0;

    if (shouldCapture) {
      const currentText = parts.join('') + input.slice(lastIndex);
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

  const encryptedText = parts.join('') + input.slice(lastIndex);
  const postBytes = whiteningEnabled
    ? applyClassicalByteWhitening(
        textToRawBytes(encryptedText),
        caesarWhiteningSeed(shift, 'post'),
      )
    : undefined;
  const finalText = postBytes ? bytesToHex(postBytes) : encryptedText;
  if (whiteningEnabled) {
    steps.push(
      createStep(
        steps.length + 1,
        'Classical byte post-whitening',
        finalText,
        MAX_STORED_STEP_TEXT_LENGTH,
        {},
        postBytes,
        encryptedText,
      ),
    );
  }

  return {
    finalText,
    steps,
    metricStats: calculateStepMetricStats(steps),
  };
}

export function encryptVigenereByKeySymbols(
  text: string,
  key: string,
  whitening: ClassicalWhiteningOptions = {},
): CipherResponseDto {
  assertText(text);
  const keySymbols = normalizeKey(key);
  const whiteningEnabled = whitening.enabled === true;
  const input = text;
  const steps: CipherStepResponseDto[] = [];

  keySymbols.forEach((symbol, index) => {
    const encryptedText = encryptVigenerePartial(input, keySymbols, index);

    steps.push(
      createStep(
        steps.length + 1,
        `Applied key symbol '${symbol.original}' (${index + 1} of ${keySymbols.length})`,
        encryptedText,
      ),
    );
  });

  const encryptedText = encryptVigenereFull(input, keySymbols);
  const postBytes = whiteningEnabled
    ? applyClassicalByteWhitening(
        textToRawBytes(encryptedText),
        keyWhiteningSeedFromSymbols(keySymbols, 'post'),
      )
    : undefined;
  const finalText = postBytes ? bytesToHex(postBytes) : encryptedText;
  if (whiteningEnabled) {
    steps.push(
      createStep(
        steps.length + 1,
        'Classical byte post-whitening',
        finalText,
        undefined,
        {},
        postBytes,
        encryptedText,
      ),
    );
  }

  return {
    finalText,
    steps,
    metricStats: calculateStepMetricStats(steps),
  };
}

export function encryptVigenereByKeyLengths(
  text: string,
  key: string,
  keyLengths = [1, 3, 5, 10, 20],
  whitening: ClassicalWhiteningOptions = {},
): CipherResponseDto {
  assertText(text);
  const normalizedKey = normalizeKey(key);
  const whiteningEnabled = whitening.enabled === true;
  const input = text;
  const uniqueLengths = Array.from(new Set(keyLengths)).sort((a, b) => a - b);
  const steps: CipherStepResponseDto[] = [];

  uniqueLengths.forEach((length) => {
    const effectiveKey = expandKey(normalizedKey, length);
    const encryptedText = encryptVigenereFull(input, effectiveKey);
    const postBytes = whiteningEnabled
      ? applyClassicalByteWhitening(
          textToRawBytes(encryptedText),
          keyWhiteningSeedFromSymbols(normalizedKey, 'post'),
        )
      : undefined;
    const state = postBytes ? bytesToHex(postBytes) : encryptedText;

    steps.push(
      createStep(
        steps.length + 1,
        `Encrypted with key length ${length}`,
        state,
        undefined,
        { keyLength: length },
        postBytes,
        encryptedText,
      ),
    );
  });

  const encryptedText = encryptVigenereFull(
    input,
    expandKey(normalizedKey, uniqueLengths.at(-1) ?? normalizedKey.length),
  );
  const postBytes = whiteningEnabled
    ? applyClassicalByteWhitening(
        textToRawBytes(encryptedText),
        keyWhiteningSeedFromSymbols(normalizedKey, 'post'),
      )
    : undefined;
  const finalText = postBytes ? bytesToHex(postBytes) : encryptedText;

  return {
    finalText,
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

function applyClassicalByteWhitening(
  bytes: Uint8Array,
  seed: number,
): Uint8Array {
  let state = seed >>> 0;
  return Uint8Array.from(bytes, (byte) => {
    state = nextPrngState(state);
    return byte ^ (state & 0xff);
  });
}

function caesarWhiteningSeed(shift: number, phase: 'pre' | 'post'): number {
  return (
    (0x9e3779b9 ^
      Math.imul(shift | 0, 0x85ebca6b) ^
      (phase === 'pre' ? 0x13579bdf : 0x2468ace0)) >>>
    0
  );
}

function keyWhiteningSeed(key: Uint8Array, phase: 'pre' | 'post'): number {
  let seed = phase === 'pre' ? 0x811c9dc5 : 0x01000193;
  for (const byte of key) {
    seed ^= byte;
    seed = Math.imul(seed, 0x01000193) >>> 0;
  }

  return seed >>> 0;
}

function keyWhiteningSeedFromSymbols(
  key: KeySymbol[],
  phase: 'pre' | 'post',
): number {
  return keyWhiteningSeed(
    Uint8Array.from(key, (symbol) => symbol.shift & 0xff),
    phase,
  );
}

function nextPrngState(state: number): number {
  let next = state || 0x6d2b79f5;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  return next >>> 0;
}

function textToRawBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
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
  byteMetricBytes?: Uint8Array,
  wordMetricText = text,
): CipherStepResponseDto {
  const wordMetrics = calculateTextMetrics(wordMetricText);
  const byteMetrics = calculateByteMetrics(byteMetricBytes ?? textToRawBytes(text));

  return {
    step,
    description,
    ...metadata,
    text: maxStoredTextLength ? truncateText(text, maxStoredTextLength) : text,
    ...wordMetrics,
    wordHurstExponent: wordMetrics.hurstExponent,
    wordDfaAlpha: wordMetrics.dfaAlpha,
    wordEntropy: wordMetrics.wordFrequencyEntropy,
    byteHurstExponent: byteMetrics.hurstExponent,
    byteDfaAlpha: byteMetrics.dfaAlpha,
    byteEntropy: byteMetrics.wordFrequencyEntropy,
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
  const byteMetrics = calculateByteMetrics(bytes);

  return {
    step,
    description,
    ...metadata,
    text: maxStoredTextLength ? truncateText(hex, maxStoredTextLength) : hex,
    ...byteMetrics,
    byteHurstExponent: byteMetrics.hurstExponent,
    byteDfaAlpha: byteMetrics.dfaAlpha,
    byteEntropy: byteMetrics.wordFrequencyEntropy,
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

function getClassicalWhiteningOptions(
  parameters: ClassicalCipherParameters,
): ClassicalWhiteningOptions {
  return { enabled: parameters.whiteningEnabled === true };
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
    const values = steps
      .map((step) => step[metric.key])
      .filter((value): value is number => typeof value === 'number');
    if (values.length === 0) {
      return null;
    }

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
  }).filter((item): item is CipherMetricStatDto => item !== null);
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
