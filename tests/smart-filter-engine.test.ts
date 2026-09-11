import assert from 'node:assert/strict';
import test from 'node:test';
import { sharpenRgba } from '../lib/smart-filter-engine.ts';

void test('Smart Sharpen leaves a flat field and alpha channel unchanged', () => {
  const input = new Uint8ClampedArray(3 * 3 * 4);
  for (let index = 0; index < input.length; index += 4) {
    input[index] = input[index + 1] = input[index + 2] = 100;
    input[index + 3] = 180 + index / 4;
  }
  assert.deepEqual(sharpenRgba(input, 3, 3, 80), input);
});

void test('Smart Sharpen increases real edge contrast', () => {
  const input = new Uint8ClampedArray(3 * 3 * 4);
  for (let index = 0; index < input.length; index += 4) {
    input[index] = input[index + 1] = input[index + 2] = 100;
    input[index + 3] = 255;
  }
  const center = (1 * 3 + 1) * 4;
  input[center] = input[center + 1] = input[center + 2] = 140;
  const output = sharpenRgba(input, 3, 3, 50);
  assert.ok(output[center] > input[center]);
  assert.ok(output[(1 * 3 + 0) * 4] < 100);
  assert.equal(output[center + 3], 255);
});

void test('zero-amount Smart Sharpen is an exact no-op copy', () => {
  const input = new Uint8ClampedArray([10, 20, 30, 40, 50, 60, 70, 80]);
  const output = sharpenRgba(input, 2, 1, 0);
  assert.deepEqual(output, input);
  assert.notEqual(output, input);
});
