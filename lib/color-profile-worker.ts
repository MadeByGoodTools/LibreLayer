/// <reference lib="webworker" />

import {
  convertRgbaChunked,
  type ColorProfileId,
  type PortableIccProfile,
  type RenderingIntent,
} from './color-management';

type Request = {
  pixels: Uint8ClampedArray | Float32Array;
  source: ColorProfileId | PortableIccProfile;
  target: ColorProfileId | PortableIccProfile;
  intent: RenderingIntent;
  blackPointCompensation: boolean;
};

self.onmessage = async (event: MessageEvent<Request>) => {
  try {
    const result = await convertRgbaChunked(
      event.data.pixels,
      event.data.source,
      event.data.target,
      event.data.intent,
      event.data.blackPointCompensation,
      {
        onProgress: (progress) =>
          self.postMessage({ kind: 'progress', progress }),
      },
    );
    self.postMessage(
      { kind: 'result', pixels: result },
      { transfer: [result.buffer] },
    );
  } catch (error) {
    self.postMessage({
      kind: 'error',
      message:
        error instanceof Error ? error.message : 'Color conversion failed.',
    });
  }
};

export {};
