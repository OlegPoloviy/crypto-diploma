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
  deaDelta: number;
  wordFrequencyEntropy: number;
  wordHurstExponent?: number;
  wordDfaAlpha?: number;
  wordDeaDelta?: number;
  wordEntropy?: number;
  byteHurstExponent?: number;
  byteDfaAlpha?: number;
  byteDeaDelta?: number;
  byteEntropy?: number;
}

export type CipherMetricKey =
  | "hurstExponent"
  | "dfaAlpha"
  | "deaDelta"
  | "wordFrequencyEntropy"
  | "wordHurstExponent"
  | "wordDfaAlpha"
  | "wordDeaDelta"
  | "wordEntropy"
  | "byteHurstExponent"
  | "byteDfaAlpha"
  | "byteDeaDelta"
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
  progressPercent: number;
  progressProcessed: number;
  progressTotal: number;
  progressMessage?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CipherMode = "caesar" | "vigenere-key-symbols" | "vigenere-key-lengths";
