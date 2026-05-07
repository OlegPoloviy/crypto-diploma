import { CipherResponseDto } from './dto/cipher-response.dto';

export enum ClassicalCipherAlgorithm {
  CAESAR = 'caesar',
  VIGENERE_KEY_SYMBOLS = 'vigenere_key_symbols',
  VIGENERE_KEY_LENGTHS = 'vigenere_key_lengths',
}

export enum ClassicalCipherJobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export type ClassicalCipherParameters =
  | { shift: number; maxSteps?: number }
  | { key: string; keyLengths?: number[] };

export interface ClassicalCipherWorkerData {
  text: string;
  algorithm: ClassicalCipherAlgorithm;
  parameters: ClassicalCipherParameters;
}

export type ClassicalCipherWorkerResult = CipherResponseDto | { error: string };
