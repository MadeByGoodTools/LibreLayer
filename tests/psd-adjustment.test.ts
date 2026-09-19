import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeCanvas, readPsd, writePsd } from 'ag-psd';
import {
  highDepthToPsdBrightness,
  psdBrightnessToHighDepth,
  supportedPsdAdjustment,
} from '../lib/psd-adjustment.ts';
import { createDefaultHighDepthAdjustments } from '../lib/high-depth.ts';

initializeCanvas(
  () => {
    throw new Error('Canvas allocation was not expected');
  },
  (width, height) =>
    ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }) as ImageData,
);

void test('brightness and contrast map to a native PSD adjustment', () => {
  const native = highDepthToPsdBrightness({
    ...createDefaultHighDepthAdjustments(),
    brightness: 18,
    contrast: -9,
  });
  assert.deepEqual(native, {
    type: 'brightness/contrast',
    brightness: 18,
    contrast: -9,
    useLegacy: false,
  });
  const restored = psdBrightnessToHighDepth(native!);
  assert.equal(restored.brightness, 18);
  assert.equal(restored.contrast, -9);
});

void test('combined LibreLayer recipes cannot masquerade as one native adjustment', () => {
  assert.equal(
    highDepthToPsdBrightness({
      ...createDefaultHighDepthAdjustments(),
      brightness: 10,
      exposure: 1,
    }),
    undefined,
  );
});

void test('the PSD codec preserves the editable brightness adjustment record', () => {
  const imageData = { width: 2, height: 2, data: new Uint8ClampedArray(16) };
  const adjustment = highDepthToPsdBrightness({
    ...createDefaultHighDepthAdjustments(),
    brightness: 12,
    contrast: 7,
  });
  const decoded = readPsd(
    writePsd({
      width: 2,
      height: 2,
      imageData,
      children: [{ name: 'Brightness', adjustment }],
    }),
    { useImageData: true },
  );
  const restored = decoded.children?.[0]?.adjustment;
  assert.equal(supportedPsdAdjustment(restored), true);
  assert.equal(restored?.type, 'brightness/contrast');
  assert.equal(
    restored?.type === 'brightness/contrast' ? restored.brightness : undefined,
    12,
  );
});
