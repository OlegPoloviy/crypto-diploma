export type ClassicalCipherAlgorithm =
  | "caesar"
  | "vigenere_key_symbols"
  | "vigenere_key_lengths";

export type ClassicalCipherJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export interface CipherStep {
  step: number;
  description: string;
  keyLength?: number;
  text: string;
  hurstExponent: number;
  dfaAlpha: number;
  wordFrequencyEntropy: number;
  wordHurstExponent?: number;
  wordDfaAlpha?: number;
  wordEntropy?: number;
  byteHurstExponent?: number;
  byteDfaAlpha?: number;
  byteEntropy?: number;
}

export type CipherMetricKey =
  | "hurstExponent"
  | "dfaAlpha"
  | "wordFrequencyEntropy"
  | "wordHurstExponent"
  | "wordDfaAlpha"
  | "wordEntropy"
  | "byteHurstExponent"
  | "byteDfaAlpha"
  | "byteEntropy";

export interface CipherMetricStat {
  key: CipherMetricKey;
  label: string;
  final: number;
  mean: number;
  standardDeviation: number;
  min: number;
  max: number;
}

export interface ClassicalCipherJob {
  id: string;
  parsedTextId: string;
  algorithm: ClassicalCipherAlgorithm;
  status: ClassicalCipherJobStatus;
  parameters: Record<string, unknown>;
  finalText?: string | null;
  steps?: CipherStep[] | null;
  metricStats?: CipherMetricStat[] | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CipherMode = "caesar" | "vigenere-key-symbols" | "vigenere-key-lengths";
