import PixelFilterWorker from './pixel-filter-worker?worker';
import {
  applyPixelFilterRequest,
  type PixelFilterRequest,
} from './pixel-filter-core';
import { JobCancelledError, JobWatchdogError } from './filter-plugin-job';

export type PixelFilterJobResult =
  | { backend: 'offscreen-worker'; bitmap: ImageBitmap }
  | {
      backend: 'worker-array' | 'cooperative-main-thread';
      pixels: Uint8ClampedArray;
    };

const fallback = async (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  filter: PixelFilterRequest,
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: number) => void;
  },
): Promise<PixelFilterJobResult> => {
  if (options.signal?.aborted) throw new JobCancelledError();
  options.onProgress?.(5);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  if (options.signal?.aborted) throw new JobCancelledError();
  const output = applyPixelFilterRequest(pixels, width, height, filter);
  if (options.signal?.aborted) throw new JobCancelledError();
  options.onProgress?.(100);
  return { backend: 'cooperative-main-thread', pixels: output };
};

export function runPixelFilterJob(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  filter: PixelFilterRequest,
  options: {
    signal?: AbortSignal;
    timeoutMs?: number;
    onProgress?: (progress: number) => void;
  } = {},
): Promise<PixelFilterJobResult> {
  if (options.signal?.aborted) return Promise.reject(new JobCancelledError());
  let worker: Worker;
  try {
    worker = new PixelFilterWorker();
  } catch {
    return fallback(pixels, width, height, filter, options);
  }
  return new Promise((resolve, reject) => {
    const input = new Uint8ClampedArray(pixels),
      finish = (result: PixelFilterJobResult | Error) => {
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
              'The pixel filter exceeded its safety time limit.',
            ),
          ),
        Math.max(1000, Math.min(300_000, options.timeoutMs ?? 120_000)),
      );
    options.signal?.addEventListener('abort', cancel, { once: true });
    worker.onerror = () =>
      finish(new Error('The background pixel filter stopped unexpectedly.'));
    worker.onmessage = (
      event: MessageEvent<
        | { kind: 'progress'; progress: number }
        | {
            kind: 'result';
            backend: 'offscreen-worker';
            bitmap: ImageBitmap;
          }
        | {
            kind: 'result';
            backend: 'worker-array';
            pixels: Uint8ClampedArray;
          }
        | { kind: 'error'; message: string }
      >,
    ) => {
      if (event.data.kind === 'progress') {
        options.onProgress?.(
          Math.max(0, Math.min(100, Math.round(event.data.progress))),
        );
      } else if (event.data.kind === 'error') {
        finish(new Error(event.data.message));
      } else if (event.data.backend === 'offscreen-worker') {
        options.onProgress?.(100);
        finish({ backend: event.data.backend, bitmap: event.data.bitmap });
      } else {
        options.onProgress?.(100);
        finish({
          backend: event.data.backend,
          pixels: new Uint8ClampedArray(event.data.pixels),
        });
      }
    };
    worker.postMessage({ pixels: input, width, height, filter }, [
      input.buffer,
    ]);
  });
}
