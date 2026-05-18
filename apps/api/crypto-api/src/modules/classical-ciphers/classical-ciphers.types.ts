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

export enum ClassicalCipherOperation {
  ENCRYPT = 'encrypt',
  DECRYPT = 'decrypt',
}

export type ClassicalCipherParameters =
  | {
      operation?: ClassicalCipherOperation;
      shift: number;
      maxSteps?: number;
      inputEncoding?: 'utf8' | 'hex';
      whiteningEnabled?: boolean;
    }
  | {
      operation?: ClassicalCipherOperation;
      key: string;
      keyLengths?: number[];
      inputEncoding?: 'utf8' | 'hex';
      whiteningEnabled?: boolean;
    };

export interface ClassicalCipherWorkerData {
  text: string;
  algorithm: ClassicalCipherAlgorithm;
  parameters: ClassicalCipherParameters;
}

export interface CipherWorkerProgress {
  type: 'progress';
  percent: number;
  processed: number;
  total: number;
  message: string;
}

export type ClassicalCipherWorkerResult =
  | CipherResponseDto
  | CipherWorkerProgress
  | { error: string };
