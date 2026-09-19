import assert from 'node:assert/strict';
import test from 'node:test';
import { applyWasmSimdInvert } from '../lib/wasm-simd-core.ts';

void test('WASM SIMD invert processes vector and tail pixels while preserving alpha', async () => {
  const source = new Uint8ClampedArray([
    0, 10, 255, 7, 1, 2, 3, 64, 20, 40, 60, 128, 240, 230, 220, 192, 99, 100,
    101, 255,
  ]);
  const result = await applyWasmSimdInvert(source, 5, 1);
  assert.deepEqual(
    [...result],
    [
      255, 245, 0, 7, 254, 253, 252, 64, 235, 215, 195, 128, 15, 25, 35, 192,
      156, 155, 154, 255,
    ],
  );
  assert.deepEqual(
    [...source],
    [
      0, 10, 255, 7, 1, 2, 3, 64, 20, 40, 60, 128, 240, 230, 220, 192, 99, 100,
      101, 255,
    ],
  );
});

void test('WASM SIMD invert rejects malformed dimensions', async () => {
  await assert.rejects(
    applyWasmSimdInvert(new Uint8ClampedArray(8), 3, 1),
    /invalid pixel dimensions/,
  );
});
