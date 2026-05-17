import { CipherMetricStatDto } from '../classical-ciphers/dto/cipher-metric-stat.dto';
import { CipherStepResponseDto } from '../classical-ciphers/dto/cipher-step-response.dto';
import { XorWhiteningParameterInput } from './block-cipher-xor-whitening';

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

export enum DesOperation {
  ENCRYPT = 'encrypt',
  DECRYPT = 'decrypt',
}

export enum KalynaOperation {
  ENCRYPT = 'encrypt',
  DECRYPT = 'decrypt',
}

export enum KalynaBlockSize {
  BITS_128 = 128,
  BITS_256 = 256,
  BITS_512 = 512,
}

export enum ComplexCipherAlgorithm {
  AES = 'aes',
  DES = 'des',
  KALYNA = 'kalyna',
}

export enum ComplexCipherJobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface AesJobParameters extends XorWhiteningParameterInput {
  key: string;
  inputEncoding?: BinaryEncoding;
  keyEncoding?: BinaryEncoding;
  outputEncoding?: BinaryEncoding;
  mode?: AesMode;
  iv?: string;
  ivEncoding?: BinaryEncoding;
}

export interface DesJobParameters extends XorWhiteningParameterInput {
  key: string;
  inputEncoding?: BinaryEncoding;
  keyEncoding?: BinaryEncoding;
  outputEncoding?: BinaryEncoding;
  mode?: AesMode;
  iv?: string;
  ivEncoding?: BinaryEncoding;
}

export interface WhiteningMetricComparison {
  metricStats: CipherMetricStatDto[];
  byteEntropy: number;
  finalText?: string;
}

export interface WhiteningComparisonMetadata {
  withWhitening: WhiteningMetricComparison;
  withoutWhitening: WhiteningMetricComparison;
}

export interface KalynaJobParameters {
  key: string;
  blockSizeBits: KalynaBlockSize;
  inputEncoding?: BinaryEncoding;
  keyEncoding?: BinaryEncoding;
  outputEncoding?: BinaryEncoding;
  mode?: AesMode;
  iv?: string;
  ivEncoding?: BinaryEncoding;
}

export type ComplexCipherParameters =
  | AesJobParameters
  | DesJobParameters
  | KalynaJobParameters;

export interface ComplexCipherWorkerData {
  text: string;
  algorithm: ComplexCipherAlgorithm;
  parameters: ComplexCipherParameters;
}

export interface ComplexCipherWorkerResult {
  finalText: string;
  steps?: CipherStepResponseDto[];
  metricStats: CipherMetricStatDto[];
  metadata: Record<string, unknown>;
}

export type ComplexCipherWorkerMessage =
  | ComplexCipherWorkerResult
  | { error: string };
