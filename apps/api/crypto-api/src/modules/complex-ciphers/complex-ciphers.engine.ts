import { BadRequestException } from '@nestjs/common';
import {
  CipherMetricKey,
  CipherMetricStatDto,
} from '../classical-ciphers/dto/cipher-metric-stat.dto';
import { CipherStepResponseDto } from '../classical-ciphers/dto/cipher-step-response.dto';
import { calculateByteMetrics } from '../classical-ciphers/classical-ciphers.metrics';
import {
  encryptAesCorpusWithSampledSteps,
  formatBytes,
  parseBytes,
} from './aes.engine';
import {
  AesMode,
  BinaryEncoding,
  ComplexCipherAlgorithm,
  ComplexCipherParameters,
  ComplexCipherWorkerResult,
} from './complex-ciphers.types';

export function runComplexCipher(
  text: string,
  algorithm: ComplexCipherAlgorithm,
  parameters: ComplexCipherParameters,
): ComplexCipherWorkerResult {
  switch (algorithm) {
    case ComplexCipherAlgorithm.AES:
      return encryptTextWithAes(text, parameters);
    default:
      throw new BadRequestException('Unsupported complex cipher algorithm');
  }
}

function encryptTextWithAes(
  text: string,
  parameters: ComplexCipherParameters,
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
  const result = encryptAesCorpusWithSampledSteps(plaintext, key, { mode, iv });
  const ciphertext = result.ciphertext;
  const encodedIv =
    mode === AesMode.CBC && iv
      ? formatBytes(iv, BinaryEncoding.HEX)
      : undefined;
  const finalText = formatBytes(ciphertext, outputEncoding);
  const stepResponses = result.steps.map((bytes, index) =>
    createAesStep(index, result.steps.length, bytes, outputEncoding),
  );
  const finalMetrics = calculateByteMetrics(
    result.steps.at(-1) ?? new Uint8Array(),
  );
  const byteEntropy = finalMetrics.wordFrequencyEntropy;

  return {
    finalText,
    steps: stepResponses,
    metricStats: calculateStepMetricStats(stepResponses),
    metadata: {
      mode,
      keySize: key.length * 8,
      inputEncoding,
      outputEncoding,
      iv: encodedIv,
      plaintextLength: plaintext.length,
      ciphertextLength: ciphertext.length,
      stepSampleSize: result.sampleSize,
      stepSampled: result.sampleSize < result.totalBytes,
      stepSampleSourceBytes: result.totalBytes,
      byteEntropy,
    },
  };
}

function createAesStep(
  index: number,
  totalSteps: number,
  bytes: Uint8Array,
  outputEncoding: BinaryEncoding,
): CipherStepResponseDto {
  const metrics = calculateByteMetrics(bytes);

  return {
    step: index + 1,
    description: createAesStepDescription(index, totalSteps),
    text: formatBytes(bytes, outputEncoding),
    hurstExponent: metrics.hurstExponent,
    dfaAlpha: metrics.dfaAlpha,
    wordFrequencyEntropy: metrics.wordFrequencyEntropy,
  };
}

function createAesStepDescription(index: number, totalSteps: number): string {
  if (index === 0) {
    return 'AES initial AddRoundKey (whitening)';
  }

  const round = index;
  const lastRound = totalSteps - 1;
  if (round === lastRound) {
    return `AES final round ${round} of ${lastRound}`;
  }

  return `AES round ${round} of ${lastRound}`;
}

function calculateStepMetricStats(
  steps: CipherStepResponseDto[],
): CipherMetricStatDto[] {
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
