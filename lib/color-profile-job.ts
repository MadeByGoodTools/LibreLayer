import ColorProfileWorker from './color-profile-worker?worker';
import {
  convertRgbaChunked,
  type ColorProfileId,
  type RenderingIntent,
} from './color-management';
import { JobCancelledError, JobWatchdogError } from './filter-plugin-job';

export type ColorProfileJobResult = {
  pixels: Uint8ClampedArray | Float32Array;
  backend: 'worker' | 'cooperative-main-thread';
};

const fallback = async (
  pixels: Uint8ClampedArray | Float32Array,
  source: ColorProfileId,
  target: ColorProfileId,
  intent: RenderingIntent,
  blackPointCompensation: boolean,
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: number) => void;
  },
): Promise<ColorProfileJobResult> => {
  try {
    return {
      pixels: await convertRgbaChunked(
        pixels,
        source,
        target,
        intent,
        blackPointCompensation,
        options,
      ),
      backend: 'cooperative-main-thread',
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw new JobCancelledError();
    throw error;
  }
};

export function runColorProfileJob(
  pixels: Uint8ClampedArray | Float32Array,
  source: ColorProfileId,
  target: ColorProfileId,
  intent: RenderingIntent,
  blackPointCompensation: boolean,
  options: {
    signal?: AbortSignal;
    timeoutMs?: number;
    onProgress?: (progress: number) => void;
  } = {},
): Promise<ColorProfileJobResult> {
  if (options.signal?.aborted) return Promise.reject(new JobCancelledError());
  let worker: Worker;
  try {
    worker = new ColorProfileWorker();
  } catch {
    return fallback(
      pixels,
      source,
      target,
      intent,
      blackPointCompensation,
      options,
    );
  }
  return new Promise((resolve, reject) => {
    const input =
        pixels instanceof Float32Array
          ? new Float32Array(pixels)
          : new Uint8ClampedArray(pixels),
      finish = (result: ColorProfileJobResult | Error) => {
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
              'The document color conversion exceeded its safety time limit.',
            ),
          ),
        Math.max(1000, Math.min(300_000, options.timeoutMs ?? 180_000)),
      );
    options.signal?.addEventListener('abort', cancel, { once: true });
    worker.onerror = () =>
      finish(new Error('The color-conversion worker stopped unexpectedly.'));
    worker.onmessage = (
      event: MessageEvent<
        | { kind: 'progress'; progress: number }
        | {
            kind: 'result';
            pixels: Uint8ClampedArray | Float32Array;
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
      } else {
        finish({
          pixels:
            event.data.pixels instanceof Float32Array
              ? new Float32Array(event.data.pixels)
              : new Uint8ClampedArray(event.data.pixels),
          backend: 'worker',
        });
      }
    };
    worker.postMessage(
      {
        pixels: input,
        source,
        target,
        intent,
        blackPointCompensation,
      },
      [input.buffer],
    );
  });
}
