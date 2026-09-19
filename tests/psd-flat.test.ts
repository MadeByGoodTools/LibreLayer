import assert from 'node:assert/strict';
import test from 'node:test';
import { getCompositeImageData, initializeCanvas, readPsd } from 'ag-psd';
import { encodeFlatHighDepthPsd } from '../lib/psd-flat.ts';
import {
  psdHasMergedTransparency,
  restoreLazyCompositeAlpha,
} from '../lib/psd-composite-alpha.ts';
import { readSupportedPsdHeader } from '../lib/psd-header.ts';

initializeCanvas(
  () => ({}) as HTMLCanvasElement,
  (width, height) =>
    ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }) as ImageData,
);

void test('flattened 16-bit PSD retains adjacent integer samples', () => {
  const encoded = encodeFlatHighDepthPsd({
      version: 1,
      depth: '16u',
      width: 2,
      height: 1,
      data: new Uint16Array([
        10000, 20000, 30000, 65535, 10001, 20001, 30001, 65535,
      ]),
    }),
    pixels = getCompositeImageData(readPsd(encoded, { useRawData: true }));
  assert.equal(readSupportedPsdHeader(encoded).bitDepth, 16);
  assert.ok(pixels?.data instanceof Uint16Array);
  assert.equal(pixels.data[0], 10000);
  assert.equal(pixels.data[4], 10001);
});

void test('flattened 32-bit PSB retains scene values above display white', () => {
  const encoded = encodeFlatHighDepthPsd(
      {
        version: 1,
        depth: '32f',
        width: 1,
        height: 1,
        data: new Float32Array([2.5, 0.5, 0.25, 1]),
      },
      true,
    ),
    pixels = getCompositeImageData(readPsd(encoded, { useRawData: true }));
  assert.equal(readSupportedPsdHeader(encoded).version, 2);
  assert.ok(pixels?.data instanceof Float32Array);
  assert.equal(pixels.data[0], 2.5);
});

void test('high-depth flattened PSD retains additional alpha-channel samples', () => {
  const mask = {
      data: new Uint8ClampedArray([12, 12, 12, 255, 240, 240, 240, 255]),
      width: 2,
      height: 1,
    } as ImageData,
    encoded = encodeFlatHighDepthPsd(
      {
        version: 1,
        depth: '16u',
        width: 2,
        height: 1,
        data: new Uint16Array([0, 0, 0, 65535, 65535, 65535, 65535, 65535]),
      },
      false,
      [mask],
    ),
    psd = readPsd(encoded, { useRawData: true }),
    composite = getCompositeImageData(psd),
    additional = restoreLazyCompositeAlpha(
      composite,
      psd.additionalChannelData,
      psdHasMergedTransparency(encoded, false),
    );
  assert.equal(psdHasMergedTransparency(encoded, false), true);
  assert.ok(composite?.data instanceof Uint16Array);
  assert.equal(composite.data[3], 65535);
  assert.equal(additional?.length, 1);
  assert.ok(additional?.[0].data instanceof Uint16Array);
  assert.equal(additional?.[0].data[0], 3084);
  assert.equal(additional?.[0].data[1], 61680);
});
