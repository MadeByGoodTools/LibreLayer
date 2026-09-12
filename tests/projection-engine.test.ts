import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultVanishingPointRecipe,
  defaultWideAngleRecipe,
  homographyFromUnitSquare,
  projectPoint,
  remapProjectionPixels,
  vanishingPointSourcePoint,
  wideAngleSourcePoint,
} from '../lib/projection-engine.ts';

void test('neutral projection recipes preserve source coordinates', () => {
  const vanishing = vanishingPointSourcePoint(
      32,
      20,
      65,
      41,
      defaultVanishingPointRecipe(),
    ),
    wide = wideAngleSourcePoint(32, 20, 65, 41, defaultWideAngleRecipe());
  assert.ok(Math.abs(vanishing.x - 32) < 1e-8);
  assert.ok(Math.abs(vanishing.y - 20) < 1e-8);
  assert.deepEqual(wide, { x: 32, y: 20 });
});

void test('homography maps every unit-square corner onto its plane', () => {
  const quad = [
      { x: 0.1, y: 0.2 },
      { x: 0.8, y: 0.05 },
      { x: 0.95, y: 0.9 },
      { x: 0.2, y: 0.8 },
    ] as const,
    matrix = homographyFromUnitSquare([...quad]);
  for (const [index, source] of [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ].entries()) {
    const point = projectPoint(matrix, source.x, source.y);
    assert.ok(Math.abs(point.x - quad[index].x) < 1e-8);
    assert.ok(Math.abs(point.y - quad[index].y) < 1e-8);
  }
});

void test('wide-angle controls create independent geometric corrections', () => {
  const base = wideAngleSourcePoint(95, 20, 100, 80),
    radial = wideAngleSourcePoint(95, 20, 100, 80, { distortion: 50 }),
    vertical = wideAngleSourcePoint(95, 20, 100, 80, { vertical: 50 });
  assert.notDeepEqual(radial, base);
  assert.notDeepEqual(vertical, base);
  assert.notDeepEqual(vertical, radial);
});

void test('projection remapping is deterministic and validates dimensions', () => {
  const pixels = new Uint8ClampedArray(4 * 4 * 4).map(
      (_, index) => (index * 13) & 255,
    ),
    first = remapProjectionPixels(pixels, 4, 4, (x, y) => ({ x, y })),
    second = remapProjectionPixels(pixels, 4, 4, (x, y) => ({ x, y }));
  assert.deepEqual(first, pixels);
  assert.deepEqual(second, first);
  assert.throws(() => remapProjectionPixels(pixels, 3, 4, (x, y) => ({ x, y })));
});
