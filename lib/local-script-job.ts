import LocalScriptWorker from './local-script-worker?worker';
import type { LocalScriptDocument, LocalScriptTrace } from './local-script';
import type { SuiteOptions } from './pro-suite';

export class ScriptCancelledError extends Error {
  constructor() {
    super('The local script was cancelled.');
    this.name = 'ScriptCancelledError';
  }
}

export class ScriptWatchdogError extends Error {
  constructor() {
    super('The local script exceeded its two-second safety limit.');
    this.name = 'ScriptWatchdogError';
  }
}

export const runLocalScriptJob = (
  script: LocalScriptDocument,
  defaults: SuiteOptions,
  options: {
    signal?: AbortSignal;
    timeoutMs?: number;
    onProgress?: (progress: number) => void;
  } = {},
) =>
  new Promise<LocalScriptTrace>((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new ScriptCancelledError());
      return;
    }
    const worker = new LocalScriptWorker();
    let finished = false;
    const finish = (result: LocalScriptTrace | Error) => {
        if (finished) return;
        finished = true;
        clearTimeout(watchdog);
        options.signal?.removeEventListener('abort', cancel);
        worker.terminate();
        if (result instanceof Error) reject(result);
        else resolve(result);
      },
      cancel = () => finish(new ScriptCancelledError()),
      watchdog = setTimeout(
        () => finish(new ScriptWatchdogError()),
        Math.max(250, Math.min(5000, options.timeoutMs ?? 2000)),
      );
    options.signal?.addEventListener('abort', cancel, { once: true });
    worker.onerror = () =>
      finish(new Error('The disposable script worker stopped unexpectedly.'));
    worker.onmessage = (
      event: MessageEvent<
        | { kind: 'progress'; progress: number }
        | { kind: 'result'; trace: LocalScriptTrace }
        | { kind: 'error'; message: string }
      >,
    ) => {
      if (event.data.kind === 'progress') {
        options.onProgress?.(
          Math.max(0, Math.min(100, Math.round(event.data.progress))),
        );
        return;
      }
      finish(
        event.data.kind === 'result'
          ? event.data.trace
          : new Error(event.data.message),
      );
    };
    worker.postMessage({ script, defaults });
  });
