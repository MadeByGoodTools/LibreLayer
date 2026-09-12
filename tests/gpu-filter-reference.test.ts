import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyCpuReferenceFilter,
  maximumPixelDelta,
} from '../lib/gpu-filter-reference.ts';

void test('CPU reference pixel operations retain alpha and match fixed vectors', () => {
  const pixel = new Uint8ClampedArray([10, 20, 30, 77]);
  assert.deepEqual(
    [...applyCpuReferenceFilter(pixel, 'invert', 1)],
    [245, 235, 225, 77],
  );
  assert.deepEqual(
    [...applyCpuReferenceFilter(pixel, 'grayscale', 1)],
    [18, 18, 18, 77],
  );
  assert.deepEqual(
    [...applyCpuReferenceFilter(pixel, 'contrast', 0)],
    [...pixel],
  );
});

void test('reference comparison reports exact worst-channel error', () => {
  assert.equal(
    maximumPixelDelta(
      new Uint8ClampedArray([0, 20, 255, 9]),
      new Uint8ClampedArray([1, 17, 250, 9]),
    ),
    5,
  );
  assert.throws(
    () => maximumPixelDelta(new Uint8ClampedArray(4), new Uint8ClampedArray(8)),
    /matching lengths/,
  );
});
