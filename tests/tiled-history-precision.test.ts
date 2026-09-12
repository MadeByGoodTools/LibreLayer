import assert from 'node:assert/strict';
import test from 'node:test';
import { historyBytes } from '../lib/tiled-history.ts';
import { workingSurfaceFromRgba8 } from '../lib/working-depth.ts';

const tiledPixel = {
  width: 1,
  height: 1,
  tiles: [{ w: 1, h: 1, solid: 0 }],
};

void test('history memory includes high-depth buffers once when snapshots share them', () => {
  const precision = workingSurfaceFromRgba8(
      new Uint8ClampedArray([1, 2, 3, 255]),
      1,
      1,
      '32f',
    ),
    frames = [
      { surfaces: [{ id: 'layer', pixels: tiledPixel, precision }] },
      { surfaces: [{ id: 'layer', pixels: tiledPixel, precision }] },
    ];
  assert.equal(historyBytes(frames), 36 + precision.data.byteLength + 64);
});

void test('history memory counts independent high-depth snapshot buffers', () => {
  const first = workingSurfaceFromRgba8(
      new Uint8ClampedArray([1, 2, 3, 255]),
      1,
      1,
      '16u',
    ),
    second = { ...first, data: new Uint16Array(first.data) },
    frames = [
      { surfaces: [{ id: 'layer', pixels: tiledPixel, precision: first }] },
      { surfaces: [{ id: 'layer', pixels: tiledPixel, precision: second }] },
    ];
  assert.equal(historyBytes(frames), 36 + (first.data.byteLength + 64) * 2);
});
