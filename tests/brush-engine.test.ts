import assert from 'node:assert/strict';
import test from 'node:test';
import {
  interpolateStrokeDabs,
  symmetryStrokePoints,
} from '../lib/brush-engine.ts';

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

void test('mirror symmetry reflects across the document axes', () => {
  assert.deepEqual(
    symmetryStrokePoints({ x: 20, y: 30 }, 100, 80, 'vertical'),
    [
      { x: 20, y: 30 },
      { x: 80, y: 30 },
    ],
  );
  assert.deepEqual(
    symmetryStrokePoints({ x: 20, y: 30 }, 100, 80, 'horizontal'),
    [
      { x: 20, y: 30 },
      { x: 20, y: 50 },
    ],
  );
});

void test('radial symmetry creates a bounded ring of dabs', () => {
  const points = symmetryStrokePoints({ x: 75, y: 50 }, 100, 100, 'radial', 4);
  assert.equal(points.length, 4);
  assert.deepEqual(
    points.map((point) => [Math.round(point.x), Math.round(point.y)]),
    [
      [75, 50],
      [50, 75],
      [25, 50],
      [50, 25],
    ],
  );
});
