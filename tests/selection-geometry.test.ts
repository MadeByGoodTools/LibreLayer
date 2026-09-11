import assert from 'node:assert/strict';
import test from 'node:test';
import {
  marqueeBounds,
  marqueeContains,
  marqueeCoverage,
  strongestEdgeInPatch,
} from '../lib/selection-geometry.ts';

void test('single-row and single-column marquees span the document', () => {
  assert.deepEqual(
    marqueeBounds('row', { x: 8, y: 12.6, w: 20, h: 9 }, 80, 60),
    {
      x: 0,
      y: 13,
      w: 80,
      h: 1,
    },
  );
  assert.deepEqual(
    marqueeBounds('column', { x: 18.4, y: 4, w: 9, h: 20 }, 80, 60),
    { x: 18, y: 0, w: 1, h: 60 },
  );
});

void test('elliptical marquee includes its center and excludes its corners', () => {
  const bounds = { x: 10, y: 20, w: 40, h: 20 };
  assert.equal(marqueeContains('ellipse', bounds, 29, 29), true);
  assert.equal(marqueeContains('ellipse', bounds, 10, 20), false);
  assert.equal(marqueeContains('rectangle', bounds, 10, 20), true);
});

void test('fractional rectangle coverage matches subpixel reference values', () => {
  const bounds = { x: 0.25, y: 0.25, w: 1, h: 1 };
  assert.equal(marqueeCoverage('rectangle', bounds, 0, 0), 0.5625);
  assert.equal(marqueeCoverage('rectangle', bounds, 1, 0), 0.1875);
  assert.equal(marqueeCoverage('rectangle', bounds, 1, 1), 0.0625);
  assert.equal(marqueeCoverage('rectangle', bounds, 2, 2), 0);
});

void test('supersampled ellipse coverage is symmetric and stable', () => {
  const bounds = { x: 0.25, y: 0.25, w: 2.5, h: 2.5 };
  assert.equal(marqueeCoverage('ellipse', bounds, 0, 0), 0.265625);
  assert.equal(marqueeCoverage('ellipse', bounds, 2, 0), 0.265625);
  assert.equal(marqueeCoverage('ellipse', bounds, 1, 1), 1);
  assert.equal(marqueeCoverage('ellipse', bounds, 0, 2), 0.265625);
});

void test('magnetic selection finds a high-contrast edge in one pixel read', () => {
  const width = 9,
    height = 7,
    pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4,
        value = x < 5 ? 8 : 245;
      pixels[index] = pixels[index + 1] = pixels[index + 2] = value;
      pixels[index + 3] = 255;
    }
  const edge = strongestEdgeInPatch(pixels, width, height, 20, 30);
  assert.ok(edge.x === 24 || edge.x === 25);
  assert.ok(edge.score > 200);
  assert.ok(edge.y >= 31 && edge.y <= 35);
});
