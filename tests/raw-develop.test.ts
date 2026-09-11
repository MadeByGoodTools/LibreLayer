import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultRawDevelopSettings,
  developRawRgba,
  type RawLinearImage,
} from '../lib/raw-develop.ts';

const image: RawLinearImage = {
  width: 2,
  height: 2,
  data: new Float32Array([
    0.02, 0.02, 0.02, 0.18, 0.16, 0.12, 0.72, 0.62, 0.48, 1.3, 1.1, 0.9,
  ]),
  bitDepth: 14,
  camera: 'Test Camera',
  lens: 'Test Lens',
};

void test('RAW development preserves dimensions and emits opaque display pixels', () => {
  const result = developRawRgba(image, defaultRawDevelopSettings);
  assert.equal(result.width, 2);
  assert.equal(result.height, 2);
  assert.equal(result.data.length, 16);
  assert.deepEqual(
    [result.data[3], result.data[7], result.data[11], result.data[15]],
    [255, 255, 255, 255],
  );
});

void test('RAW preview scales down without changing its aspect ratio', () => {
  const wide: RawLinearImage = {
    ...image,
    width: 4,
    height: 2,
    data: new Float32Array(4 * 2 * 3).fill(0.18),
  };
  const result = developRawRgba(wide, defaultRawDevelopSettings, 2);
  assert.equal(result.width, 2);
  assert.equal(result.height, 1);
});

void test('exposure and highlight recovery materially affect the developed result', () => {
  const neutral = developRawRgba(image, {
    ...defaultRawDevelopSettings,
    highlightRecovery: 0,
  });
  const brighter = developRawRgba(image, {
    ...defaultRawDevelopSettings,
    exposure: 1,
    highlightRecovery: 0,
  });
  const recovered = developRawRgba(image, {
    ...defaultRawDevelopSettings,
    exposure: 1,
    highlightRecovery: 100,
  });
  assert.ok(brighter.data[0] > neutral.data[0]);
  assert.ok(recovered.data[12] <= brighter.data[12]);
});
