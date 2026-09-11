import assert from 'node:assert/strict';
import test from 'node:test';
import { interpolateStrokeDabs } from '../lib/brush-engine.ts';

void test('stroke interpolation keeps uniform spacing across pointer events', () => {
  const first = interpolateStrokeDabs({ x: 0, y: 0 }, { x: 7, y: 0 }, 5, 5),
    second = interpolateStrokeDabs(
      { x: 7, y: 0 },
      { x: 13, y: 0 },
      5,
      first.distanceSinceLastDab,
    );
  assert.deepEqual(first.points, [
    { x: 0, y: 0 },
    { x: 5, y: 0 },
  ]);
  assert.deepEqual(second.points, [{ x: 10, y: 0 }]);
  assert.equal(second.distanceSinceLastDab, 3);
});

void test('subpixel dabs preserve fractional coordinates', () => {
  const result = interpolateStrokeDabs(
    { x: 0.25, y: 0.5 },
    { x: 3.25, y: 4.5 },
    2.5,
    2.5,
  );
  assert.deepEqual(result.points, [
    { x: 0.25, y: 0.5 },
    { x: 1.75, y: 2.5 },
    { x: 3.25, y: 4.5 },
  ]);
});

void test('zero-length events do not duplicate a recent dab', () => {
  assert.deepEqual(
    interpolateStrokeDabs({ x: 2, y: 3 }, { x: 2, y: 3 }, 4, 1).points,
    [],
  );
});
