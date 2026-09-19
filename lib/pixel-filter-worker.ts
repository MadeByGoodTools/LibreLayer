/// <reference lib="webworker" />

import {
  applyPixelFilterRequest,
  type PixelFilterRequest,
} from './pixel-filter-core';

type Request = {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  filter: PixelFilterRequest;
};

self.onmessage = (event: MessageEvent<Request>) => {
  try {
    self.postMessage({ kind: 'progress', progress: 5 });
    const pixels = applyPixelFilterRequest(
      event.data.pixels,
      event.data.width,
      event.data.height,
      event.data.filter,
    );
    self.postMessage({ kind: 'progress', progress: 92 });
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(event.data.width, event.data.height),
        context = canvas.getContext('2d');
      if (context) {
        context.putImageData(
          new ImageData(pixels, event.data.width, event.data.height),
          0,
          0,
        );
        const bitmap = canvas.transferToImageBitmap();
        self.postMessage(
          { kind: 'result', backend: 'offscreen-worker', bitmap },
          { transfer: [bitmap] },
        );
        return;
      }
    }
    self.postMessage(
      { kind: 'result', backend: 'worker-array', pixels },
      { transfer: [pixels.buffer] },
    );
  } catch (error) {
    self.postMessage({
      kind: 'error',
      message: error instanceof Error ? error.message : 'Pixel filter failed.',
    });
  }
};

export {};
