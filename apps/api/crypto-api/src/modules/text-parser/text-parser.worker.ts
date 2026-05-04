import { parentPort, workerData } from 'worker_threads';
import { parseBookText } from './text-parser.util';

try {
  parentPort?.postMessage(parseBookText(workerData.text));
} catch (error) {
  parentPort?.postMessage({
    error: error instanceof Error ? error.message : 'Failed to parse text',
  });
}
