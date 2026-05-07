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
}

export interface ClassicalCipherJob {
  id: string;
  parsedTextId: string;
  algorithm: ClassicalCipherAlgorithm;
  status: ClassicalCipherJobStatus;
  parameters: Record<string, unknown>;
  finalText?: string | null;
  steps?: CipherStep[] | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CipherMode = "caesar" | "vigenere-key-symbols" | "vigenere-key-lengths";
