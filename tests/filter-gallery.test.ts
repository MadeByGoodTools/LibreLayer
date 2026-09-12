import assert from 'node:assert/strict';
import test from 'node:test';
import { applyReferenceFilter } from '../lib/filter-gallery.ts';

const edgeFixture = () => {
  const data = new Uint8ClampedArray(5 * 5 * 4);
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 5; x++) {
      const index = (y * 5 + x) * 4,
        value = x < 2 ? 20 : x === 2 ? 128 : 235;
      data[index] = data[index + 1] = data[index + 2] = value;
      data[index + 3] = 255;
    }
  data[(2 * 5 + 0) * 4] =
    data[(2 * 5 + 0) * 4 + 1] =
    data[(2 * 5 + 0) * 4 + 2] =
      35;
  return data;
};

void test('all reference filters produce bounded deterministic pixels', () => {
  const source = edgeFixture();
  for (const operation of [
    'blur-gallery',
    'lens-blur',
    'surface-blur',
    'smart-sharpen',
    'high-pass',
    'noise',
  ] as const) {
    const secondary = operation === 'surface-blur' ? 100 : 45,
      first = applyReferenceFilter(source, 5, 5, operation, 70, secondary),
      second = applyReferenceFilter(source, 5, 5, operation, 70, secondary);
    assert.deepEqual(first, second, operation);
    assert.notDeepEqual(first, source, operation);
    assert.equal(first[3], 255);
  }
});

void test('surface blur protects hard edges better than ordinary blur', () => {
  const source = edgeFixture(),
    ordinary = applyReferenceFilter(source, 5, 5, 'blur-gallery', 100, 0),
    surface = applyReferenceFilter(source, 5, 5, 'surface-blur', 100, 20),
    darkEdge = (2 * 5 + 1) * 4;
  assert.ok(surface[darkEdge] < ordinary[darkEdge]);
});

void test('smart sharpen and high pass retain alpha and reveal edge detail', () => {
  const source = edgeFixture(),
    sharp = applyReferenceFilter(source, 5, 5, 'smart-sharpen', 80, 30),
    high = applyReferenceFilter(source, 5, 5, 'high-pass', 80, 30);
  assert.ok(sharp[(2 * 5 + 3) * 4] >= source[(2 * 5 + 3) * 4]);
  assert.notEqual(high[(2 * 5 + 1) * 4], 128);
  assert.equal(high[3], 255);
});

void test('invalid pixel buffers fail explicitly', () => {
  assert.throws(
    () => applyReferenceFilter(new Uint8ClampedArray(3), 1, 1, 'noise', 50, 50),
    /dimensions are invalid/,
  );
});
