import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultMaskTransform,
  maskTransformIsIdentity,
  normalizeMaskTransform,
} from '../lib/mask-transform.ts';

void test('mask transforms round-trip independent position, rotation, and scale', () => {
  assert.deepEqual(
    normalizeMaskTransform({
      x: 42,
      y: -18,
      rotation: 27,
      scaleX: 1.4,
      scaleY: 0.72,
    }),
    { x: 42, y: -18, rotation: 27, scaleX: 1.4, scaleY: 0.72 },
  );
});

void test('invalid mask transforms recover to safe bounded values', () => {
  assert.deepEqual(
    normalizeMaskTransform({
      x: Number.NaN,
      y: Number.POSITIVE_INFINITY,
      rotation: 900,
      scaleX: 0,
      scaleY: 200,
    }),
    { x: 0, y: 0, rotation: 360, scaleX: 0.01, scaleY: 100 },
  );
});

void test('mask identity detection accepts missing and default recipes', () => {
  assert.equal(maskTransformIsIdentity(), true);
  assert.equal(maskTransformIsIdentity(defaultMaskTransform()), true);
  assert.equal(maskTransformIsIdentity({ x: 1 }), false);
});
