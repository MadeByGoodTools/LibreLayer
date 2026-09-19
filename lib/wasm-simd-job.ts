import WasmSimdWorker from './wasm-simd-worker?worker';
import { JobCancelledError, JobWatchdogError } from './filter-plugin-job';

export type WasmSimdJobResult = {
  pixels: Uint8ClampedArray;
  backend: 'wasm-simd-worker';
};

export const runWasmSimdInvertJob = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  options: {
    signal?: AbortSignal;
    timeoutMs?: number;
    onProgress?: (progress: number) => void;
  } = {},
) =>
  new Promise<WasmSimdJobResult>((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new JobCancelledError());
      return;
    }
    let worker: Worker;
    try {
      worker = new WasmSimdWorker();
    } catch (error) {
      reject(
        error instanceof Error
          ? error
          : new Error('The SIMD worker is unavailable.'),
      );
      return;
    }
    const input = new Uint8ClampedArray(pixels),
      finish = (result: WasmSimdJobResult | Error) => {
        clearTimeout(watchdog);
        options.signal?.removeEventListener('abort', cancel);
        worker.terminate();
        if (result instanceof Error) reject(result);
        else resolve(result);
      },
      cancel = () => finish(new JobCancelledError()),
      watchdog = setTimeout(
        () =>
          finish(
            new JobWatchdogError(
              'The SIMD filter exceeded its safety time limit.',
            ),
          ),
        Math.max(1000, Math.min(120_000, options.timeoutMs ?? 30_000)),
      );
    options.signal?.addEventListener('abort', cancel, { once: true });
    worker.onerror = () =>
      finish(new Error('The SIMD worker stopped unexpectedly.'));
    worker.onmessage = (
      event: MessageEvent<
        | { kind: 'progress'; progress: number }
        | { kind: 'result'; pixels: Uint8ClampedArray }
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
      else {
        options.onProgress?.(100);
        finish({
          pixels: new Uint8ClampedArray(event.data.pixels),
          backend: 'wasm-simd-worker',
        });
      }
    };
    worker.postMessage({ pixels: input, width, height }, [input.buffer]);
  });
