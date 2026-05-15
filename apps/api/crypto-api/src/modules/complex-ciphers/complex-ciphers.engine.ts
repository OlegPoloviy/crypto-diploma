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
import { encryptKalynaCorpusWithSampledSteps } from './kalyna.engine';
import { getKalynaParams } from './kalyna.constants';
import {
  AesMode,
  BinaryEncoding,
  ComplexCipherAlgorithm,
  ComplexCipherParameters,
  ComplexCipherWorkerResult,
  KalynaJobParameters,
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
    case ComplexCipherAlgorithm.KALYNA:
      return encryptTextWithKalyna(text, parameters as KalynaJobParameters);
    default:
      throw new BadRequestException('Unsupported complex cipher algorithm');
  }
}

export function computeInteractiveEncryptRoundInsights(
  plaintext: Uint8Array,
  key: Uint8Array,
  mode: AesMode,
  iv: Uint8Array | undefined,
  algorithm: ComplexCipherAlgorithm,
  outputEncoding: BinaryEncoding,
): {
  ciphertext: Uint8Array;
  steps: CipherStepResponseDto[];
  metricStats: CipherMetricStatDto[];
  metadata: Record<string, unknown>;
} {
  if (algorithm === ComplexCipherAlgorithm.KALYNA) {
    throw new BadRequestException(
      'Use computeKalynaEncryptRoundInsights for Kalyna',
    );
  }

  const algorithmLabel =
    algorithm === ComplexCipherAlgorithm.AES ? 'AES' : 'DES';
  const blockBytes = algorithmLabel === 'AES' ? 16 : 8;
  const paddedLength = getPaddedLength(plaintext.length, blockBytes);
  const shouldCollectRoundMetrics =
    algorithm === ComplexCipherAlgorithm.DES ||
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
    ciphertext,
    steps: stepResponses,
    metricStats: calculateStepMetricStats(stepResponses),
    metadata: {
      mode,
      keySize: key.length * 8,
      algorithm: algorithmLabel.toLowerCase(),
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

export function computeKalynaEncryptRoundInsights(
  plaintext: Uint8Array,
  key: Uint8Array,
  blockSizeBits: number,
  mode: AesMode,
  iv: Uint8Array | undefined,
  outputEncoding: BinaryEncoding,
): {
  ciphertext: Uint8Array;
  steps: CipherStepResponseDto[];
  metricStats: CipherMetricStatDto[];
  metadata: Record<string, unknown>;
} {
  const { nr, blockBytes } = getKalynaParams(blockSizeBits, key.length * 8);
  const paddedLength = getPaddedLength(plaintext.length, blockBytes);
  // Kalyna encrypts large corpora quickly; always collect sampled round metrics (like DES).
  const shouldCollectRoundMetrics = true;
  const result = encryptKalynaCorpusWithSampledSteps(plaintext, key, {
    blockSizeBits,
    mode,
    iv,
  });
  const ciphertext = result.ciphertext;
  const stepResponses = shouldCollectRoundMetrics
    ? result.steps.map((bytes, index) =>
        createBlockCipherStep(
          index,
          result.steps.length,
          bytes,
          outputEncoding,
          'Kalyna',
        ),
      )
    : [];
  const finalMetrics = calculateByteMetrics(
    sampleBytes(ciphertext, FINAL_METRIC_SAMPLE_SIZE),
  );

  return {
    ciphertext,
    steps: stepResponses,
    metricStats: calculateStepMetricStats(stepResponses),
    metadata: {
      mode,
      blockSizeBits,
      keySize: key.length * 8,
      roundCount: nr + 1,
      whitening: `additive_mod_2^${blockSizeBits}`,
      algorithm: 'kalyna',
      plaintextLength: plaintext.length,
      ciphertextLength: ciphertext.length,
      stepMetricThresholdBytes: COMPLEX_CIPHER_ROUND_METRIC_THRESHOLD_BYTES,
      stepMetricsSkipped: !shouldCollectRoundMetrics,
      stepSampleSize: shouldCollectRoundMetrics ? result.sampleSize : 0,
      stepSampled:
        shouldCollectRoundMetrics && result.sampleSize < result.totalBytes,
      stepSampleSourceBytes: result.totalBytes,
      byteEntropy: finalMetrics.wordFrequencyEntropy,
    },
  };
}

function encryptTextWithKalyna(
  text: string,
  parameters: KalynaJobParameters,
): ComplexCipherWorkerResult {
  if (!text?.trim()) {
    throw new BadRequestException('Text cannot be empty');
  }

  const mode = parameters.mode ?? AesMode.CBC;
  const inputEncoding = parameters.inputEncoding ?? BinaryEncoding.UTF8;
  const keyEncoding = parameters.keyEncoding ?? BinaryEncoding.HEX;
  const outputEncoding = parameters.outputEncoding ?? BinaryEncoding.HEX;
  const ivEncoding = parameters.ivEncoding ?? BinaryEncoding.HEX;
  const blockSizeBits = parameters.blockSizeBits;
  const plaintext = parseBytes(text, inputEncoding, 'plaintext');
  const key = parseBytes(parameters.key, keyEncoding, 'key');
  const iv = parameters.iv
    ? parseBytes(parameters.iv, ivEncoding, 'iv')
    : undefined;
  const insights = computeKalynaEncryptRoundInsights(
    plaintext,
    key,
    blockSizeBits,
    mode,
    iv,
    outputEncoding,
  );
  const encodedIv =
    mode === AesMode.CBC && iv
      ? formatBytes(iv, BinaryEncoding.HEX)
      : undefined;

  return {
    finalText: formatBytes(insights.ciphertext, outputEncoding),
    steps: insights.steps,
    metricStats: insights.metricStats,
    metadata: {
      ...insights.metadata,
      inputEncoding,
      outputEncoding,
      iv: encodedIv,
    },
  };
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
  const algorithm =
    algorithmLabel === 'AES'
      ? ComplexCipherAlgorithm.AES
      : ComplexCipherAlgorithm.DES;
  const insights = computeInteractiveEncryptRoundInsights(
    plaintext,
    key,
    mode,
    iv,
    algorithm,
    outputEncoding,
  );
  const encodedIv =
    mode === AesMode.CBC && iv
      ? formatBytes(iv, BinaryEncoding.HEX)
      : undefined;
  const finalText = formatBytes(insights.ciphertext, outputEncoding);

  return {
    finalText,
    steps: insights.steps,
    metricStats: insights.metricStats,
    metadata: {
      ...insights.metadata,
      inputEncoding,
      outputEncoding,
      iv: encodedIv,
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
  algorithmLabel: 'AES' | 'DES' | 'Kalyna',
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
  algorithmLabel: 'AES' | 'DES' | 'Kalyna',
): string {
  if (algorithmLabel === 'AES' && index === 0) {
    return 'AES initial AddRoundKey (whitening)';
  }

  if (algorithmLabel === 'Kalyna' && index === 0) {
    return 'Kalyna initial AddRoundKey (mod 2^64)';
  }

  const round = algorithmLabel === 'DES' ? index + 1 : index;
  const lastRound = algorithmLabel === 'DES' ? totalSteps : totalSteps - 1;
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
