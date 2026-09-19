/// <reference lib="webworker" />

import { applyWasmSimdInvert } from './wasm-simd-core';

type Request = {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
};

self.onmessage = (event: MessageEvent<Request>) => {
  self.postMessage({ kind: 'progress', progress: 10 });
  void applyWasmSimdInvert(
    event.data.pixels,
    event.data.width,
    event.data.height,
  )
    .then((pixels) => {
      self.postMessage({ kind: 'progress', progress: 92 });
      self.postMessage(
        { kind: 'result', pixels },
        { transfer: [pixels.buffer] },
      );
    })
    .catch((error) =>
      self.postMessage({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'The SIMD worker failed.',
      }),
    );
};

export {};
