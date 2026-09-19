import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeEps, encodeEps } from '../lib/eps-codec.ts';

if (!globalThis.ImageData)
  globalThis.ImageData = class ImageData {
    readonly colorSpace = 'srgb' as const;
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(data: Uint8ClampedArray, width: number, height: number) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  } as typeof ImageData;

void test('EPS export reopens its standards-based colorimage payload', () => {
  const source = new ImageData(
      new Uint8ClampedArray([255, 0, 0, 255, 0, 80, 200, 128]),
      2,
      1,
    ),
    decoded = decodeEps(encodeEps(source));
  assert.ok(decoded.image);
  assert.deepEqual(
    Array.from(decoded.image!.data),
    [255, 0, 0, 255, 127, 167, 227, 255],
  );
});

void test('EPS decoding fails closed without a supported preview', () => {
  assert.throws(
    () =>
      decodeEps(
        new TextEncoder().encode('%!PS-Adobe-3.0 EPSF-3.0\n%%EOF').buffer,
      ),
    /no supported TIFF preview/,
  );
});
