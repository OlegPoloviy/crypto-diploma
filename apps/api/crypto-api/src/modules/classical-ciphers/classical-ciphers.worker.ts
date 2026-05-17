import { parentPort, workerData } from 'worker_threads';
import { runClassicalCipher } from './classical-ciphers.engine';
import {
  ClassicalCipherWorkerData,
  ClassicalCipherWorkerResult,
} from './classical-ciphers.types';

try {
  const data = workerData as ClassicalCipherWorkerData;
  parentPort?.postMessage({
    type: 'progress',
    percent: 1,
    processed: 0,
    total: Math.max(1, data.text.length),
    message: 'Worker started',
  });
  const result: ClassicalCipherWorkerResult = runClassicalCipher(
    data.text,
    data.algorithm,
    data.parameters,
    {
      onProgress: (progress) => {
        parentPort?.postMessage({
          type: 'progress',
          percent: Math.max(
            1,
            Math.min(99, Math.round((progress.processed / progress.total) * 98)),
          ),
          processed: progress.processed,
          total: progress.total,
          message: progress.message,
        });
      },
    },
  );
  parentPort?.postMessage({
    type: 'progress',
    percent: 99,
    processed: Math.max(1, data.text.length),
    total: Math.max(1, data.text.length),
    message: 'Finalizing metrics',
  });
  parentPort?.postMessage(result);
} catch (error) {
  parentPort?.postMessage({
    error: error instanceof Error ? error.message : 'Failed to run cipher',
  });
}
