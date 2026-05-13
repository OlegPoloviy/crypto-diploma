import { BadRequestException } from '@nestjs/common';
import {
  CipherMetricKey,
  CipherMetricStatDto,
} from '../classical-ciphers/dto/cipher-metric-stat.dto';
import { CipherStepResponseDto } from '../classical-ciphers/dto/cipher-step-response.dto';
import { calculateByteMetrics } from '../classical-ciphers/classical-ciphers.metrics';
import {
  encryptAes,
  encryptAesCorpusWithSampledSteps,
  formatBytes,
  parseBytes,
} from './aes.engine';
import { encryptDes, encryptDesCorpusWithSampledSteps } from './des.engine';
import {
  AesMode,
  BinaryEncoding,
  ComplexCipherAlgorithm,
  ComplexCipherParameters,
  ComplexCipherWorkerResult,
} from './complex-ciphers.types';

const COMPLEX_CIPHER_ROUND_METRIC_THRESHOLD_BYTES = 50_000;
const FINAL_METRIC_SAMPLE_SIZE = 50_000;

export function runComplexCipher(
  text: string,
  algorithm: ComplexCipherAlgorithm,
  parameters: ComplexCipherParameters,
): ComplexCipherWorkerResult {
  switch (algorithm) {
    case ComplexCipherAlgorithm.AES:
      return encryptTextWithBlockCipher(text, parameters, 'AES');
    case ComplexCipherAlgorithm.DES:
      return encryptTextWithBlockCipher(text, parameters, 'DES');
    default:
      throw new BadRequestException('Unsupported complex cipher algorithm');
  }
}

function encryptTextWithBlockCipher(
  text: string,
  parameters: ComplexCipherParameters,
  algorithmLabel: 'AES' | 'DES',
): ComplexCipherWorkerResult {
  if (!text?.trim()) {
    throw new BadRequestException('Text cannot be empty');
  }

  const mode = parameters.mode ?? AesMode.CBC;
  const inputEncoding = parameters.inputEncoding ?? BinaryEncoding.UTF8;
  const keyEncoding = parameters.keyEncoding ?? BinaryEncoding.HEX;
  const outputEncoding = parameters.outputEncoding ?? BinaryEncoding.HEX;
  const ivEncoding = parameters.ivEncoding ?? BinaryEncoding.HEX;
  const plaintext = parseBytes(text, inputEncoding, 'plaintext');
  const key = parseBytes(parameters.key, keyEncoding, 'key');
  const iv = parameters.iv
    ? parseBytes(parameters.iv, ivEncoding, 'iv')
    : undefined;
  const paddedLength = getPaddedLength(
    plaintext.length,
    algorithmLabel === 'AES' ? 16 : 8,
  );
  const shouldCollectRoundMetrics =
    paddedLength <= COMPLEX_CIPHER_ROUND_METRIC_THRESHOLD_BYTES;
  const result = shouldCollectRoundMetrics
    ? algorithmLabel === 'AES'
      ? encryptAesCorpusWithSampledSteps(plaintext, key, { mode, iv })
      : encryptDesCorpusWithSampledSteps(plaintext, key, { mode, iv })
    : {
        ciphertext:
          algorithmLabel === 'AES'
            ? encryptAes(plaintext, key, { mode, iv }).ciphertext
            : encryptDes(plaintext, key, { mode, iv }).ciphertext,
        steps: [],
        sampleSize: 0,
        totalBytes: paddedLength,
      };
  const ciphertext = result.ciphertext;
  const encodedIv =
    mode === AesMode.CBC && iv
      ? formatBytes(iv, BinaryEncoding.HEX)
      : undefined;
  const finalText = formatBytes(ciphertext, outputEncoding);
  const stepResponses = shouldCollectRoundMetrics
    ? result.steps.map((bytes, index) =>
        createBlockCipherStep(
          index,
          result.steps.length,
          bytes,
          outputEncoding,
          algorithmLabel,
        ),
      )
    : [];
  const finalMetrics = calculateByteMetrics(
    sampleBytes(ciphertext, FINAL_METRIC_SAMPLE_SIZE),
  );
  const byteEntropy = finalMetrics.wordFrequencyEntropy;

  return {
    finalText,
    steps: stepResponses,
    metricStats: calculateStepMetricStats(stepResponses),
    metadata: {
      mode,
      keySize: key.length * 8,
      algorithm: algorithmLabel.toLowerCase(),
      inputEncoding,
      outputEncoding,
      iv: encodedIv,
      plaintextLength: plaintext.length,
      ciphertextLength: ciphertext.length,
      stepMetricThresholdBytes: COMPLEX_CIPHER_ROUND_METRIC_THRESHOLD_BYTES,
      stepMetricsSkipped: !shouldCollectRoundMetrics,
      stepSampleSize: shouldCollectRoundMetrics ? result.sampleSize : 0,
      stepSampled:
        shouldCollectRoundMetrics && result.sampleSize < result.totalBytes,
      stepSampleSourceBytes: result.totalBytes,
      byteEntropy,
    },
  };
}

function getPaddedLength(byteLength: number, blockSize: number): number {
  const remainder = byteLength % blockSize;
  const paddingLength = remainder === 0 ? blockSize : blockSize - remainder;

  return byteLength + paddingLength;
}

function createBlockCipherStep(
  index: number,
  totalSteps: number,
  bytes: Uint8Array,
  outputEncoding: BinaryEncoding,
  algorithmLabel: 'AES' | 'DES',
): CipherStepResponseDto {
  const metrics = calculateByteMetrics(bytes);

  return {
    step: index + 1,
    description: createBlockCipherStepDescription(
      index,
      totalSteps,
      algorithmLabel,
    ),
    text: formatBytes(bytes, outputEncoding),
    hurstExponent: metrics.hurstExponent,
    dfaAlpha: metrics.dfaAlpha,
    wordFrequencyEntropy: metrics.wordFrequencyEntropy,
  };
}

function createBlockCipherStepDescription(
  index: number,
  totalSteps: number,
  algorithmLabel: 'AES' | 'DES',
): string {
  if (algorithmLabel === 'AES' && index === 0) {
    return 'AES initial AddRoundKey (whitening)';
  }

  const round = algorithmLabel === 'AES' ? index : index + 1;
  const lastRound = algorithmLabel === 'AES' ? totalSteps - 1 : totalSteps;
  if (round === lastRound) {
    return `${algorithmLabel} final round ${round} of ${lastRound}`;
  }

  return `${algorithmLabel} round ${round} of ${lastRound}`;
}

function calculateStepMetricStats(
  steps: CipherStepResponseDto[],
): CipherMetricStatDto[] {
  if (steps.length === 0) {
    return [];
  }

  const metricLabels: Array<{ key: CipherMetricKey; label: string }> = [
    { key: 'hurstExponent', label: 'Hurst' },
    { key: 'dfaAlpha', label: 'DFA' },
    { key: 'wordFrequencyEntropy', label: 'Byte entropy' },
  ];

  return metricLabels.map((metric) => {
    const values = steps.map((step) => step[metric.key]);
    const mean = average(values);
    const variance = average(values.map((value) => (value - mean) ** 2));

    return {
      key: metric.key,
      label: metric.label,
      final: values.at(-1) ?? 0,
      mean: roundMetric(mean),
      standardDeviation: roundMetric(Math.sqrt(variance)),
      min: Math.min(...values),
      max: Math.max(...values),
    };
  });
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundMetric(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 10000) / 10000;
}

function sampleBytes(bytes: Uint8Array, maxSampleSize: number): Uint8Array {
  if (bytes.length <= maxSampleSize) {
    return bytes;
  }

  const sample = new Uint8Array(maxSampleSize);
  for (let index = 0; index < maxSampleSize; index += 1) {
    const sourceIndex = Math.floor((index * bytes.length) / maxSampleSize);
    sample[index] = bytes[sourceIndex];
  }

  return sample;
}
