import assert from 'node:assert/strict';
import test from 'node:test';
import {
  captureTiles,
  dirtyTileIndices,
  historyBytes,
} from '../lib/tiled-history.ts';
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

void test('dirty history capture selects only intersecting document tiles', () => {
  assert.deepEqual(
    [...dirtyTileIndices(1024, 768, { x: 250, y: 250, width: 20, height: 20 })],
    [0, 1, 4, 5],
  );
  assert.deepEqual(
    [...dirtyTileIndices(1024, 768, { x: 800, y: 600, width: 30, height: 30 })],
    [11],
  );
});

void test('dirty history capture ignores invalid or off-canvas regions', () => {
  assert.deepEqual(
    [...dirtyTileIndices(1024, 768, { x: -50, y: -50, width: 20, height: 20 })],
    [],
  );
  assert.deepEqual(
    [...dirtyTileIndices(1024, 768, { x: 0, y: 0, width: 0, height: 20 })],
    [],
  );
});

void test('dirty history capture reads changed tiles and reuses untouched tiles', () => {
  const previous = {
      width: 512,
      height: 512,
      tiles: Array.from({ length: 4 }, (_, index) => ({
        w: 256,
        h: 256,
        solid: index,
      })),
    },
    reads: Array<[number, number, number, number]> = [],
    canvas = {
      width: 512,
      height: 512,
      getContext: () => ({
        getImageData: (x: number, y: number, width: number, height: number) => {
          reads.push([x, y, width, height]);
          const data = new Uint8ClampedArray(width * height * 4);
          data.fill(1);
          return { data };
        },
      }),
    } as unknown as HTMLCanvasElement,
    captured = captureTiles(canvas, previous, {
      x: 20,
      y: 20,
      width: 10,
      height: 10,
    });
  assert.deepEqual(reads, [[0, 0, 256, 256]]);
  assert.notEqual(captured.tiles[0], previous.tiles[0]);
  assert.equal(captured.tiles[1], previous.tiles[1]);
  assert.equal(captured.tiles[2], previous.tiles[2]);
  assert.equal(captured.tiles[3], previous.tiles[3]);
});
