import assert from 'node:assert/strict';
import test from 'node:test';
import { traceAlphaContours } from '../lib/vector-trace.ts';

const pixels = (width: number, height: number, filled: [number, number][]) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const [x, y] of filled) data[(y * width + x) * 4 + 3] = 255;
  return data;
};

void test('alpha tracing turns a solid glyph block into an editable contour', () => {
  const contour = traceAlphaContours(
    pixels(4, 4, [
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
    ]),
    4,
    4,
  );
  assert.equal(contour.length, 1);
  assert.deepEqual(contour[0], [
    { x: 1, y: 1 },
    { x: 3, y: 1 },
    { x: 3, y: 3 },
    { x: 1, y: 3 },
  ]);
});

void test('alpha tracing preserves disconnected glyph contours', () => {
  const contours = traceAlphaContours(
    pixels(5, 2, [
      [0, 0],
      [4, 0],
    ]),
    5,
    2,
  );
  assert.equal(contours.length, 2);
  assert.ok(contours.every((contour) => contour.length === 4));
});

void test('alpha tracing validates dimensions and point budgets', () => {
  assert.throws(
    () => traceAlphaContours(new Uint8ClampedArray(3), 2, 2),
    /Invalid trace pixels/,
  );
  assert.equal(
    traceAlphaContours(pixels(2, 2, [[0, 0]]), 2, 2, 24, 3).length,
    0,
  );
});
