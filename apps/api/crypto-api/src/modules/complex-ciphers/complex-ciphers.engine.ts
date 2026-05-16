import { BadRequestException } from '@nestjs/common';
import {
  CipherMetricKey,
  CipherMetricStatDto,
} from '../classical-ciphers/dto/cipher-metric-stat.dto';
import { CipherStepResponseDto } from '../classical-ciphers/dto/cipher-step-response.dto';
import { calculateByteMetrics } from '../classical-ciphers/classical-ciphers.metrics';
import {
  resolveXorWhiteningOptions,
  type XorWhiteningParameterInput,
} from './block-cipher-xor-whitening';
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
  DesJobParameters,
  KalynaJobParameters,
  WhiteningComparisonMetadata,
} from './complex-ciphers.types';

/** Padded plaintext above this size skips per-round step metrics (AES only). */
export const COMPLEX_CIPHER_ROUND_METRIC_THRESHOLD_BYTES = 12_000_000;
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
  whiteningParameters?: XorWhiteningParameterInput,
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
  const whiteningEnabled = whiteningParameters?.whiteningEnabled ?? false;
  const activeWhitening = resolveXorWhiteningOptions(
    key,
    blockBytes,
    whiteningParameters,
  );
  const primaryInsights = computeBlockCipherEncryptInsights(
    plaintext,
    key,
    mode,
    iv,
    algorithmLabel,
    outputEncoding,
    activeWhitening,
  );
  const withoutInsights = computeBlockCipherEncryptInsights(
    plaintext,
    key,
    mode,
    iv,
    algorithmLabel,
    outputEncoding,
    { enabled: false },
  );
  const withInsights = whiteningEnabled
    ? primaryInsights
    : computeBlockCipherEncryptInsights(
        plaintext,
        key,
        mode,
        iv,
        algorithmLabel,
        outputEncoding,
        resolveXorWhiteningOptions(key, blockBytes, {
          ...whiteningParameters,
          whiteningEnabled: true,
        }),
      );
  const whiteningComparison: WhiteningComparisonMetadata = {
    withWhitening: {
      metricStats: withInsights.metricStats,
      byteEntropy: withInsights.byteEntropy,
      finalText: formatBytes(withInsights.ciphertext, outputEncoding),
    },
    withoutWhitening: {
      metricStats: withoutInsights.metricStats,
      byteEntropy: withoutInsights.byteEntropy,
      finalText: formatBytes(withoutInsights.ciphertext, outputEncoding),
    },
  };

  return {
    ciphertext: primaryInsights.ciphertext,
    steps: primaryInsights.steps,
    metricStats: primaryInsights.metricStats,
    metadata: {
      ...primaryInsights.metadata,
      xorWhiteningEnabled: whiteningEnabled,
      whiteningFormula: 'Y = E_K(X ⊕ K_pre) ⊕ K_post',
      whiteningComparison,
    },
  };
}

function computeBlockCipherEncryptInsights(
  plaintext: Uint8Array,
  key: Uint8Array,
  mode: AesMode,
  iv: Uint8Array | undefined,
  algorithmLabel: 'AES' | 'DES',
  outputEncoding: BinaryEncoding,
  whitening: ReturnType<typeof resolveXorWhiteningOptions>,
): {
  ciphertext: Uint8Array;
  steps: CipherStepResponseDto[];
  metricStats: CipherMetricStatDto[];
  byteEntropy: number;
  metadata: Record<string, unknown>;
} {
  const blockBytes = algorithmLabel === 'AES' ? 16 : 8;
  const paddedLength = getPaddedLength(plaintext.length, blockBytes);
  const cipherOptions = { mode, iv, whitening };
  const shouldCollectRoundMetrics =
    algorithmLabel === 'DES' ||
    paddedLength <= COMPLEX_CIPHER_ROUND_METRIC_THRESHOLD_BYTES;
  const result = shouldCollectRoundMetrics
    ? algorithmLabel === 'AES'
      ? encryptAesCorpusWithSampledSteps(plaintext, key, cipherOptions)
      : encryptDesCorpusWithSampledSteps(plaintext, key, cipherOptions)
    : {
        ciphertext:
          algorithmLabel === 'AES'
            ? encryptAes(plaintext, key, cipherOptions).ciphertext
            : encryptDes(plaintext, key, cipherOptions).ciphertext,
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
          whitening.enabled,
        ),
      )
    : [];
  const finalMetrics = calculateByteMetrics(
    sampleBytes(ciphertext, FINAL_METRIC_SAMPLE_SIZE),
  );
  const byteEntropy = finalMetrics.wordFrequencyEntropy;
  const metricStats =
    stepResponses.length > 0
      ? calculateStepMetricStats(stepResponses)
      : calculateCiphertextMetricStats(ciphertext);

  return {
    ciphertext,
    steps: stepResponses,
    metricStats,
    byteEntropy,
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
      xorWhiteningEnabled: whitening.enabled,
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
  const whiteningParameters = parameters as DesJobParameters;
  const insights = computeInteractiveEncryptRoundInsights(
    plaintext,
    key,
    mode,
    iv,
    algorithm,
    outputEncoding,
    whiteningParameters,
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
  xorWhiteningEnabled = false,
): CipherStepResponseDto {
  const metrics = calculateByteMetrics(bytes);

  return {
    step: index + 1,
    description: createBlockCipherStepDescription(
      index,
      totalSteps,
      algorithmLabel,
      xorWhiteningEnabled,
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
  xorWhiteningEnabled = false,
): string {
  if (xorWhiteningEnabled && index === 0) {
    return `${algorithmLabel} XOR pre-whitening (X ⊕ K_pre)`;
  }

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

function calculateCiphertextMetricStats(
  ciphertext: Uint8Array,
): CipherMetricStatDto[] {
  const metrics = calculateByteMetrics(
    sampleBytes(ciphertext, FINAL_METRIC_SAMPLE_SIZE),
  );

  return (
    [
      { key: 'hurstExponent' as const, label: 'Hurst' },
      { key: 'dfaAlpha' as const, label: 'DFA' },
      { key: 'wordFrequencyEntropy' as const, label: 'Byte entropy' },
    ] satisfies Array<{ key: CipherMetricKey; label: string }>
  ).map((metric) => {
    const value = metrics[metric.key];

    return {
      key: metric.key,
      label: metric.label,
      final: roundMetric(value),
      mean: roundMetric(value),
      standardDeviation: 0,
      min: roundMetric(value),
      max: roundMetric(value),
    };
  });
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
