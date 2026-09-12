import assert from 'node:assert/strict';
import test from 'node:test';
import {
  brushTileBounds,
  partitionBrushDabs,
  type BrushDab,
} from '../lib/gpu-brush-renderer.ts';

const dab = (x: number, y: number, size = 20): BrushDab => ({
  x,
  y,
  size,
  alpha: 0.8,
  angle: 0,
  roundness: 1,
});

void test('brush tile bounds retain fractional dab coverage and padding', () => {
  assert.deepEqual(brushTileBounds([dab(10.25, 20.75, 8)]), {
    x: 4,
    y: 14,
    width: 13,
    height: 13,
  });
});

void test('widely separated symmetry dabs split into bounded GPU tiles', () => {
  const groups = partitionBrushDabs(
    [dab(20, 20), dab(1800, 20), dab(3600, 20)],
    512,
  );
  assert.equal(groups.length, 3);
  assert.ok(
    groups.every((group) => {
      const bounds = brushTileBounds(group)!;
      return bounds.width <= 512 && bounds.height <= 512;
    }),
  );
});

void test('invalid and invisible dabs are excluded from renderer batches', () => {
  assert.deepEqual(
    partitionBrushDabs([
      dab(1, 2),
      { ...dab(3, 4), alpha: 0 },
      { ...dab(5, 6), x: Number.NaN },
    ]),
    [[dab(1, 2)]],
  );
});
