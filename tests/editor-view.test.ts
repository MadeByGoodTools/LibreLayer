import test from 'node:test';
import assert from 'node:assert/strict';
import { containRect } from '../lib/editor-view.ts';

void test('comparison documents preserve their aspect ratio', () => {
  assert.deepEqual(containRect(2000, 1000, 1000, 1000), {
    x: 0,
    y: 250,
    width: 1000,
    height: 500,
  });
  assert.deepEqual(containRect(1000, 2000, 1000, 500), {
    x: 375,
    y: 0,
    width: 250,
    height: 500,
  });
});

void test('comparison dimensions must be finite and positive', () => {
  assert.throws(() => containRect(0, 10, 100, 100));
  assert.throws(() => containRect(10, Number.NaN, 100, 100));
});
