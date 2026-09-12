/// <reference lib="webworker" />
import {
  autoBlendStack,
  estimateTranslation,
  focusStack,
  mergeHdrStack,
  statisticalStack,
  toneMapHdr,
  type StackMode,
} from './stack-engine';

type Request = {
  command: 'align' | 'auto-blend' | 'focus' | 'hdr' | 'statistical';
  sources: Uint8ClampedArray[];
  width: number;
  height: number;
  mode?: StackMode;
};

self.onmessage = (event: MessageEvent<Request>) => {
  try {
    const { command, sources, width, height } = event.data;
    self.postMessage({ kind: 'progress', progress: 10 });
    if (command === 'align') {
      const translations = sources.map((source, index) => {
        const result = index
          ? estimateTranslation(sources[0], source, width, height)
          : { x: 0, y: 0, error: 0 };
        self.postMessage({
          kind: 'progress',
          progress: 10 + Math.round(((index + 1) / sources.length) * 85),
        });
        return result;
      });
      self.postMessage({ kind: 'aligned', translations });
      return;
    }
    const pixels =
      command === 'auto-blend'
        ? autoBlendStack(sources, width, height)
        : command === 'focus'
          ? focusStack(sources, width, height)
          : command === 'hdr'
            ? toneMapHdr(mergeHdrStack(sources, width, height))
            : statisticalStack(sources, width, height, event.data.mode ?? 'mean');
    self.postMessage({ kind: 'progress', progress: 95 });
    self.postMessage(
      { kind: 'result', pixels },
      { transfer: [pixels.buffer] },
    );
  } catch (error) {
    self.postMessage({
      kind: 'error',
      message: error instanceof Error ? error.message : 'Image stack failed.',
    });
  }
};

export {};
