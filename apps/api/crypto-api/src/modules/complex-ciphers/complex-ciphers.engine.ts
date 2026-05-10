import { BadRequestException } from '@nestjs/common';
import {
  CipherMetricKey,
  CipherMetricStatDto,
} from '../classical-ciphers/dto/cipher-metric-stat.dto';
import { calculateTextMetrics } from '../classical-ciphers/classical-ciphers.metrics';
import { encryptAes, formatBytes, parseBytes } from './aes.engine';
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
  const keyEncoding = parameters.keyEncoding ?? BinaryEncoding.HEX;
  const outputEncoding = parameters.outputEncoding ?? BinaryEncoding.HEX;
  const ivEncoding = parameters.ivEncoding ?? BinaryEncoding.HEX;
  const plaintext = parseBytes(text, BinaryEncoding.UTF8, 'plaintext');
  const key = parseBytes(parameters.key, keyEncoding, 'key');
  const iv = parameters.iv
    ? parseBytes(parameters.iv, ivEncoding, 'iv')
    : undefined;
  const result = encryptAes(plaintext, key, { mode, iv });
  const encodedIv = result.iv
    ? formatBytes(result.iv, BinaryEncoding.HEX)
    : undefined;
  const finalText = formatBytes(result.ciphertext, outputEncoding);
  const textMetrics = calculateTextMetrics(finalText);
  const byteEntropy = calculateByteEntropy(result.ciphertext);

  return {
    finalText,
    metricStats: [
      createSingleValueMetric(
        'hurstExponent',
        'Hurst',
        textMetrics.hurstExponent,
      ),
      createSingleValueMetric('dfaAlpha', 'DFA', textMetrics.dfaAlpha),
      createSingleValueMetric(
        'wordFrequencyEntropy',
        'Entropy',
        textMetrics.wordFrequencyEntropy,
      ),
    ],
    metadata: {
      mode,
      keySize: key.length * 8,
      inputEncoding: BinaryEncoding.UTF8,
      outputEncoding,
      iv: encodedIv,
      plaintextLength: plaintext.length,
      ciphertextLength: result.ciphertext.length,
      byteEntropy,
    },
  };
}

function createSingleValueMetric(
  key: CipherMetricKey,
  label: string,
  value: number,
): CipherMetricStatDto {
  return {
    key,
    label,
    final: value,
    mean: value,
    standardDeviation: 0,
    min: value,
    max: value,
  };
}

function calculateByteEntropy(bytes: Uint8Array): number {
  if (bytes.length === 0) {
    return 0;
  }

  const counts = new Map<number, number>();
  for (const byte of bytes) {
    counts.set(byte, (counts.get(byte) ?? 0) + 1);
  }

  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / bytes.length;
    entropy -= probability * Math.log2(probability);
  }

  return Math.round(entropy * 10000) / 10000;
}
