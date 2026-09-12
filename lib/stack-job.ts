import StackWorker from './stack-worker?worker';
import type { StackMode, Translation } from './stack-engine';
import { JobCancelledError, JobWatchdogError } from './filter-plugin-job';

export type StackJobResult =
  | { kind: 'aligned'; translations: Translation[] }
  | { kind: 'result'; pixels: Uint8ClampedArray };

export function runStackJob(
  command: 'align' | 'auto-blend' | 'focus' | 'hdr' | 'statistical',
  sources: readonly Uint8ClampedArray[],
  width: number,
  height: number,
  options: {
    mode?: StackMode;
    signal?: AbortSignal;
    timeoutMs?: number;
    onProgress?: (progress: number) => void;
  } = {},
) {
  return new Promise<StackJobResult>((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new JobCancelledError());
      return;
    }
    const worker = new StackWorker(),
      copies = sources.map((source) => new Uint8ClampedArray(source)),
      finish = (result: StackJobResult | Error) => {
        clearTimeout(watchdog);
        options.signal?.removeEventListener('abort', cancel);
        worker.terminate();
        if (result instanceof Error) reject(result);
        else resolve(result);
      },
      cancel = () => finish(new JobCancelledError()),
      watchdog = setTimeout(
        () => finish(new JobWatchdogError('The image stack exceeded its safety time limit.')),
        Math.max(1000, Math.min(180000, options.timeoutMs ?? 60000)),
      );
    options.signal?.addEventListener('abort', cancel, { once: true });
    worker.onerror = () => finish(new Error('The image-stack worker stopped unexpectedly.'));
    worker.onmessage = (
      event: MessageEvent<
        | { kind: 'progress'; progress: number }
        | { kind: 'aligned'; translations: Translation[] }
        | { kind: 'result'; pixels: Uint8ClampedArray }
        | { kind: 'error'; message: string }
      >,
    ) => {
      if (event.data.kind === 'progress') options.onProgress?.(event.data.progress);
      else if (event.data.kind === 'error') finish(new Error(event.data.message));
      else if (event.data.kind === 'aligned')
        finish({ kind: 'aligned', translations: event.data.translations });
      else finish({ kind: 'result', pixels: new Uint8ClampedArray(event.data.pixels) });
    };
    try {
      worker.postMessage(
        { command, sources: copies, width, height, mode: options.mode },
        copies.map((copy) => copy.buffer),
      );
    } catch (error) {
      finish(
        error instanceof Error
          ? error
          : new Error('The image-stack worker could not start.'),
      );
    }
  });
}
