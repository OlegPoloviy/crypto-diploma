import { CipherMetricStatDto } from '../classical-ciphers/dto/cipher-metric-stat.dto';

export enum AesMode {
  ECB = 'ecb',
  CBC = 'cbc',
}

export enum BinaryEncoding {
  UTF8 = 'utf8',
  HEX = 'hex',
  BASE64 = 'base64',
}

export enum AesOperation {
  ENCRYPT = 'encrypt',
  DECRYPT = 'decrypt',
}

export enum ComplexCipherAlgorithm {
  AES = 'aes',
}

export enum ComplexCipherJobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface AesJobParameters {
  key: string;
  keyEncoding?: BinaryEncoding;
  outputEncoding?: BinaryEncoding;
  mode?: AesMode;
  iv?: string;
  ivEncoding?: BinaryEncoding;
}

export type ComplexCipherParameters = AesJobParameters;

export interface ComplexCipherWorkerData {
  text: string;
  algorithm: ComplexCipherAlgorithm;
  parameters: ComplexCipherParameters;
}

export interface ComplexCipherWorkerResult {
  finalText: string;
  metricStats: CipherMetricStatDto[];
  metadata: Record<string, unknown>;
}

export type ComplexCipherWorkerMessage =
  | ComplexCipherWorkerResult
  | { error: string };
