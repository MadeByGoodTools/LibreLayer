import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDistortFilter } from '../lib/distort-filter.ts';

const fixture = () => {
  const data = new Uint8ClampedArray(9 * 7 * 4);
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 9; x++) {
      const index = (y * 9 + x) * 4;
      data[index] = x * 28;
      data[index + 1] = y * 38;
      data[index + 2] = (x + y) * 15;
      data[index + 3] = 255;
    }
  return data;
};

void test('all distortion families create distinct deterministic output', () => {
  const source = fixture(),
    outputs = new Set<string>();
  for (const operation of [
    'lens-correction',
    'displace',
    'polar',
    'wave',
    'ripple',
    'spherize',
    'pixelate',
    'halftone',
  ] as const) {
    const first = applyDistortFilter(source, 9, 7, operation, 75, 60),
      second = applyDistortFilter(source, 9, 7, operation, 75, 60);
    assert.deepEqual(first, second, operation);
    assert.notDeepEqual(first, source, operation);
    assert.equal(first[3], 255);
    outputs.add([...first].join(','));
  }
  assert.equal(outputs.size, 8);
});

void test('neutral lens correction preserves the source exactly', () => {
  const source = fixture();
  assert.deepEqual(
    applyDistortFilter(source, 9, 7, 'lens-correction', 50, 50),
    source,
  );
});

void test('invalid distortion buffers fail explicitly', () => {
  assert.throws(
    () => applyDistortFilter(new Uint8ClampedArray(2), 1, 1, 'wave', 50, 50),
    /dimensions are invalid/,
  );
});
