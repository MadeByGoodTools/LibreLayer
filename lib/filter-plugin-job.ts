import FilterPluginWorker from './filter-plugin-worker?worker';
import type {
  FilterPluginManifest,
  FilterPluginResult,
} from './filter-plugin';

export class JobCancelledError extends Error {
  constructor(message = 'The operation was cancelled.') {
    super(message);
    this.name = 'JobCancelledError';
  }
}

export class JobWatchdogError extends Error {
  constructor(message = 'The operation exceeded its safety time limit.') {
    super(message);
    this.name = 'JobWatchdogError';
  }
}

export const runFilterPluginJob = (
  manifest: FilterPluginManifest,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  options: {
    amount?: number;
    signal?: AbortSignal;
    timeoutMs?: number;
    onProgress?: (progress: number) => void;
  } = {},
) =>
  new Promise<FilterPluginResult>((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new JobCancelledError());
      return;
    }
    const worker = new FilterPluginWorker(),
      input = new Uint8ClampedArray(pixels),
      finish = (result: FilterPluginResult | Error) => {
        clearTimeout(watchdog);
        options.signal?.removeEventListener('abort', cancel);
        worker.terminate();
        if (result instanceof Error) reject(result);
        else resolve(result);
      },
      cancel = () => finish(new JobCancelledError()),
      watchdog = setTimeout(
        () => finish(new JobWatchdogError()),
        Math.max(1000, Math.min(120000, options.timeoutMs ?? 30000)),
      );
    options.signal?.addEventListener('abort', cancel, { once: true });
    worker.onerror = () => finish(new Error('The filter worker stopped unexpectedly.'));
    worker.onmessage = (
      event: MessageEvent<
        | { kind: 'progress'; progress: number }
        | ({ kind: 'result' } & FilterPluginResult)
        | { kind: 'error'; message: string }
      >,
    ) => {
      if (event.data.kind === 'progress') {
        options.onProgress?.(
          Math.max(0, Math.min(100, Math.round(event.data.progress))),
        );
        return;
      }
      if (event.data.kind === 'error') finish(new Error(event.data.message));
      else
        finish({
          pixels: new Uint8ClampedArray(event.data.pixels),
          backend: event.data.backend,
          warning: event.data.warning,
        });
    };
    worker.postMessage(
      {
        manifest,
        pixels: input,
        width,
        height,
        amount: options.amount ?? 100,
      },
      [input.buffer],
    );
  });
