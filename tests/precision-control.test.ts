import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampPrecisionValue,
  precisionMultiplier,
  replacePrecisionValue,
  scrubPrecisionValue,
} from '../lib/precision-control.ts';

void test('scrubby controls support normal, coarse, and fine movement', () => {
  assert.equal(scrubPrecisionValue(50, 2, 1, 0, 100), 52);
  assert.equal(scrubPrecisionValue(50, 2, 1, 0, 100, true), 70);
  assert.equal(scrubPrecisionValue(50, 2, 1, 0, 100, false, true), 50.2);
  assert.equal(precisionMultiplier(true, true), 0.1);
});

void test('direct numeric values clamp cleanly to their declared range', () => {
  assert.equal(clampPrecisionValue(101, 0, 100, 1), 100);
  assert.equal(clampPrecisionValue(-1, 0, 100, 1), 0);
  assert.equal(clampPrecisionValue(1.234, 0, 2, 0.1), 1.23);
  assert.throws(() => clampPrecisionValue(1, 10, 0, 1));
});

void test('range values update only their active numeric field', () => {
  assert.deepEqual(replacePrecisionValue([10, 50, 90], 1, 55), [10, 55, 90]);
  assert.throws(() => replacePrecisionValue([10], 2, 20));
});
