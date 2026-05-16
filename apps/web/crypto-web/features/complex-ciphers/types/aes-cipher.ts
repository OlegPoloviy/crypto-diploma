export type AesMode = "ecb" | "cbc";

export type BinaryEncoding = "utf8" | "hex" | "base64";

export type AesOperation = "encrypt" | "decrypt";

export type ComplexCipherAlgorithm = "aes" | "des" | "kalyna";

export type KalynaBlockSize = 128 | 256 | 512;

export interface AesResponse {
  operation: AesOperation;
  mode: AesMode;
  keySize: number;
  blockSizeBits?: number;
  outputEncoding: BinaryEncoding;
  result: string;
  iv?: string;
  /** Present after interactive encrypt when round metrics were computed */
  steps?: CipherStep[] | null;
  metricStats?: CipherMetricStat[] | null;
  metadata?: Record<string, unknown> | null;
}

export interface XorWhiteningInput {
  whiteningEnabled?: boolean;
  kPre?: string;
  kPost?: string;
  whiteningKeyEncoding?: BinaryEncoding;
}

export interface WhiteningMetricComparison {
  metricStats: CipherMetricStat[];
  byteEntropy: number;
  finalText?: string;
}

export interface WhiteningComparisonMetadata {
  withWhitening: WhiteningMetricComparison;
  withoutWhitening: WhiteningMetricComparison;
}

export interface AesEncryptInput extends XorWhiteningInput {
  plaintext: string;
  key: string;
  blockSizeBits?: KalynaBlockSize;
  inputEncoding: BinaryEncoding;
  keyEncoding: BinaryEncoding;
  outputEncoding: BinaryEncoding;
  mode: AesMode;
  iv?: string;
  ivEncoding: BinaryEncoding;
}

export interface AesDecryptInput extends XorWhiteningInput {
  ciphertext: string;
  key: string;
  blockSizeBits?: KalynaBlockSize;
  inputEncoding: BinaryEncoding;
  keyEncoding: BinaryEncoding;
  outputEncoding: BinaryEncoding;
  mode: AesMode;
  iv?: string;
  ivEncoding: BinaryEncoding;
}

export type ComplexCipherJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export interface ComplexCipherJob {
  id: string;
  parsedTextId: string;
  algorithm: ComplexCipherAlgorithm;
  status: ComplexCipherJobStatus;
  parameters: Record<string, unknown>;
  finalText?: string | null;
  steps?: CipherStep[] | null;
  metadata?: Record<string, unknown> | null;
  metricStats?: CipherMetricStat[] | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CipherMetricKey =
  | "hurstExponent"
  | "dfaAlpha"
  | "wordFrequencyEntropy";

export interface CipherMetricStat {
  key: CipherMetricKey;
  label: string;
  final: number;
  mean: number;
  standardDeviation: number;
  min: number;
  max: number;
}

export interface CipherStep {
  step: number;
  description: string;
  keyLength?: number;
  text: string;
  hurstExponent: number;
  dfaAlpha: number;
  wordFrequencyEntropy: number;
}

export interface CreateAesJobInput extends XorWhiteningInput {
  parsedTextId: string;
  key: string;
  blockSizeBits?: KalynaBlockSize;
  keyEncoding: BinaryEncoding;
  outputEncoding: BinaryEncoding;
  mode: AesMode;
  iv?: string;
  ivEncoding: BinaryEncoding;
}

export type CreateComplexCipherJobInput = CreateAesJobInput & {
  algorithm: ComplexCipherAlgorithm;
};
