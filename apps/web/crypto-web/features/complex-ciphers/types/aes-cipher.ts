export type AesMode = "ecb" | "cbc";

export type BinaryEncoding = "utf8" | "hex" | "base64";

export type AesOperation = "encrypt" | "decrypt";

export type ComplexCipherAlgorithm = "aes" | "des";

export interface AesResponse {
  operation: AesOperation;
  mode: AesMode;
  keySize: number;
  outputEncoding: BinaryEncoding;
  result: string;
  iv?: string;
}

export interface AesEncryptInput {
  plaintext: string;
  key: string;
  inputEncoding: BinaryEncoding;
  keyEncoding: BinaryEncoding;
  outputEncoding: BinaryEncoding;
  mode: AesMode;
  iv?: string;
  ivEncoding: BinaryEncoding;
}

export interface AesDecryptInput {
  ciphertext: string;
  key: string;
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

export interface CreateAesJobInput {
  parsedTextId: string;
  key: string;
  keyEncoding: BinaryEncoding;
  outputEncoding: BinaryEncoding;
  mode: AesMode;
  iv?: string;
  ivEncoding: BinaryEncoding;
}

export type CreateComplexCipherJobInput = CreateAesJobInput & {
  algorithm: ComplexCipherAlgorithm;
};
