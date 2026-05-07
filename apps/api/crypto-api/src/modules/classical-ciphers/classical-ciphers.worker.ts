import { parentPort, workerData } from 'worker_threads';
import { runClassicalCipher } from './classical-ciphers.engine';
import {
  ClassicalCipherWorkerData,
  ClassicalCipherWorkerResult,
} from './classical-ciphers.types';

try {
  const data = workerData as ClassicalCipherWorkerData;
  const result: ClassicalCipherWorkerResult = runClassicalCipher(
    data.text,
    data.algorithm,
    data.parameters,
  );
  parentPort?.postMessage(result);
} catch (error) {
  parentPort?.postMessage({
    error: error instanceof Error ? error.message : 'Failed to run cipher',
  });
}
