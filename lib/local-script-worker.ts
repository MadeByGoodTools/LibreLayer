/// <reference lib="webworker" />
import { executeLocalScript, type LocalScriptDocument } from './local-script';
import type { SuiteOptions } from './pro-suite';

self.onmessage = async (
  event: MessageEvent<{ script: LocalScriptDocument; defaults: SuiteOptions }>,
) => {
  try {
    const trace = await executeLocalScript(
      event.data.script,
      event.data.defaults,
      (progress) => self.postMessage({ kind: 'progress', progress }),
    );
    self.postMessage({ kind: 'result', trace });
  } catch (error) {
    self.postMessage({
      kind: 'error',
      message:
        error instanceof Error ? error.message : 'The local script failed.',
    });
  }
};
