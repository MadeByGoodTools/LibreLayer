import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyRenderFilter,
  parseConvolutionKernel,
} from '../lib/render-filter.ts';

const fixture = () => {
  const data = new Uint8ClampedArray(7 * 7 * 4);
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 7; x++) {
      const i = (y * 7 + x) * 4;
      data[i] = x * 35;
      data[i + 1] = y * 35;
      data[i + 2] = (x + y) * 18;
      data[i + 3] = 255;
    }
  return data;
};

void test('creative render filters are deterministic and distinct', () => {
  const source = fixture(),
    results = new Set<string>();
  for (const operation of [
    'oil-paint',
    'lighting',
    'clouds',
    'fibers',
    'filter-gallery',
    'custom-convolution',
  ] as const) {
    const result = applyRenderFilter(source, 7, 7, operation, 65, 42);
    assert.deepEqual(
      result,
      applyRenderFilter(source, 7, 7, operation, 65, 42),
    );
    assert.notDeepEqual(result, source);
    assert.equal(result[3], 255);
    results.add([...result].join(','));
  }
  assert.equal(results.size, 6);
});

void test('custom convolution accepts nine safe coefficients and falls back to sharpen', () => {
  assert.deepEqual(
    parseConvolutionKernel('0,-1,0,-1,5,-1,0,-1,0'),
    [0, -1, 0, -1, 5, -1, 0, -1, 0],
  );
  assert.deepEqual(
    parseConvolutionKernel('not a kernel'),
    [0, -1, 0, -1, 5, -1, 0, -1, 0],
  );
  assert.throws(() => parseConvolutionKernel('9 9 9 9 9 9 9 9 9'), /strength/);
});
