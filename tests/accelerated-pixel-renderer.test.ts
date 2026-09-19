import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCpuReferenceFilter } from '../lib/gpu-filter-reference.ts';

void test('accelerated renderer CPU reference covers every public operation', () => {
  const source = new Uint8ClampedArray([10, 20, 30, 77, 210, 150, 90, 255]);
  for (const operation of ['invert', 'grayscale', 'contrast'] as const) {
    const output = applyCpuReferenceFilter(source, operation, 0.65);
    assert.equal(output.length, source.length);
    assert.equal(output[3], 77);
    assert.equal(output[7], 255);
    assert.notDeepEqual(output, source);
  }
});

void test('accelerated renderer reference amount remains a bounded mix', () => {
  const source = new Uint8ClampedArray([8, 80, 200, 99]);
  assert.deepEqual(applyCpuReferenceFilter(source, 'invert', 0), source);
  assert.deepEqual(
    applyCpuReferenceFilter(source, 'invert', 1),
    new Uint8ClampedArray([247, 175, 55, 99]),
  );
});
