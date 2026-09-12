import PerformanceSuiteWorker from './performance-suite-worker?worker';
import type { PerformanceResult } from './performance-suite';

export type PerformanceSuiteReport = {
  results: PerformanceResult[];
  layers: { layers: number; tilePixels: number; elapsedMs: number; checksum: number };
};

export function runPerformanceSuite(
  onProgress?: (progress: number) => void,
  timeoutMs = 30000,
) {
  return new Promise<PerformanceSuiteReport>((resolve, reject) => {
    const worker = new PerformanceSuiteWorker(),
      finish = (value: PerformanceSuiteReport | Error) => {
        clearTimeout(watchdog);
        worker.terminate();
        if (value instanceof Error) reject(value);
        else resolve(value);
      },
      watchdog = setTimeout(
        () => finish(new Error('The performance check exceeded its safety limit.')),
        timeoutMs,
      );
    worker.onerror = () => finish(new Error('The performance worker stopped unexpectedly.'));
    worker.onmessage = (
      event: MessageEvent<
        | { kind: 'progress'; progress: number }
        | ({ kind: 'result' } & PerformanceSuiteReport)
        | { kind: 'error'; message: string }
      >,
    ) => {
      if (event.data.kind === 'progress') onProgress?.(event.data.progress);
      else if (event.data.kind === 'error') finish(new Error(event.data.message));
      else finish({ results: event.data.results, layers: event.data.layers });
    };
    worker.postMessage({ kind: 'run' });
  });
}
