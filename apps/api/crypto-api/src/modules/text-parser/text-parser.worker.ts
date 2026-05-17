import { parentPort, workerData } from 'worker_threads';
import { parsePlainText, TextPreprocessMode } from './text-parser.util';

try {
  const preprocess =
    workerData.preprocess ?? TextPreprocessMode.AUTO;
  parentPort?.postMessage(
    parsePlainText(workerData.text, { preprocess }),
  );
} catch (error) {
  parentPort?.postMessage({
    error: error instanceof Error ? error.message : 'Failed to parse text',
  });
}
