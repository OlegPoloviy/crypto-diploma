import { parentPort, workerData } from 'worker_threads';
import { runComplexCipher } from './complex-ciphers.engine';
import {
  ComplexCipherWorkerData,
  ComplexCipherWorkerMessage,
} from './complex-ciphers.types';

try {
  const data = workerData as ComplexCipherWorkerData;
  const total = Math.max(1, data.text.length);
  parentPort?.postMessage({
    type: 'progress',
    percent: 5,
    processed: 0,
    total,
    message: 'Preparing cipher worker',
  });
  const result: ComplexCipherWorkerMessage = runComplexCipher(
    data.text,
    data.algorithm,
    data.parameters,
  );
  parentPort?.postMessage({
    type: 'progress',
    percent: 95,
    processed: total,
    total,
    message: 'Finalizing metrics',
  });
  parentPort?.postMessage(result);
} catch (error) {
  parentPort?.postMessage({
    error: error instanceof Error ? error.message : 'Failed to run cipher',
  });
}
