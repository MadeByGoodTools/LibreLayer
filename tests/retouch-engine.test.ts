import assert from 'node:assert/strict';
import test from 'node:test';
import {
  correctRedEyePixels,
  highFrequencyPixels,
} from '../lib/retouch-engine.ts';

void test('red-eye correction reduces only dominant red pixels', () => {
  const source = new Uint8ClampedArray([230, 45, 40, 255, 110, 95, 90, 255]),
    output = correctRedEyePixels(source);
  assert.ok(output[0] < 150);
  assert.deepEqual(output.slice(4), source.slice(4));
  assert.deepEqual([...source], [230, 45, 40, 255, 110, 95, 90, 255]);
});

void test('high-frequency extraction centers unchanged detail at gray', () => {
  assert.deepEqual(
    [
      ...highFrequencyPixels(
        new Uint8ClampedArray([140, 100, 80, 200]),
        new Uint8ClampedArray([120, 110, 80, 200]),
      ),
    ],
    [138, 123, 128, 200],
  );
});

void test('frequency extraction rejects mismatched buffers', () => {
  assert.throws(
    () =>
      highFrequencyPixels(new Uint8ClampedArray(4), new Uint8ClampedArray(8)),
    /matching lengths/,
  );
});
