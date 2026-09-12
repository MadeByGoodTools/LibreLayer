/// <reference lib="webworker" />
import {
  applyFilterPlugin,
  type FilterPluginManifest,
} from './filter-plugin';

type Request = {
  manifest: FilterPluginManifest;
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  amount: number;
};

self.onmessage = (event: MessageEvent<Request>) => {
  const { manifest, pixels, width, height, amount } = event.data;
  void applyFilterPlugin(
    manifest,
    pixels,
    width,
    height,
    amount,
    (progress) => self.postMessage({ kind: 'progress', progress }),
  )
    .then((result) => {
      self.postMessage(
        { kind: 'result', ...result },
        { transfer: [result.pixels.buffer] },
      );
    })
    .catch((error) =>
      self.postMessage({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Filter worker failed.',
      }),
    );
};

export {};
