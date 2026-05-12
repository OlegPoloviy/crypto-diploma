import { parentPort, workerData } from 'worker_threads';
import { runComplexCipher } from './complex-ciphers.engine';
import {
  ComplexCipherWorkerData,
  ComplexCipherWorkerMessage,
} from './complex-ciphers.types';

try {
  const data = workerData as ComplexCipherWorkerData;
  const result: ComplexCipherWorkerMessage = runComplexCipher(
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
