import test from 'node:test';
import assert from 'node:assert/strict';
import { contentAwareFill } from '../lib/content-aware.ts';

const fixture = () => {
  const width = 7,
    height = 5,
    pixels = new Uint8ClampedArray(width * height * 4),
    mask = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      pixels.set([x * 25, y * 40, (x + y) * 15, 255], i);
      if (x >= 2 && x <= 4 && y >= 1 && y <= 3) mask[i + 3] = 255;
    }
  return { width, height, pixels, mask };
};

void test('content-aware fill changes only selected pixels', () => {
  const f = fixture();
  const result = contentAwareFill(f.pixels, f.mask, f.width, f.height, {
    samplingMode: 'auto',
    colorAdaptation: 50,
    rotation: 0,
    scale: 100,
    mirror: false,
  });
  assert.notDeepEqual(
    result.pixels.slice(17 * 4, 17 * 4 + 4),
    f.pixels.slice(17 * 4, 17 * 4 + 4),
  );
  assert.deepEqual(result.pixels.slice(0, 4), f.pixels.slice(0, 4));
  assert.ok(result.sampled.some((value) => value === 255));
});

void test('sampling and geometric adaptations produce deterministic distinct fills', () => {
  const f = fixture();
  const base = contentAwareFill(f.pixels, f.mask, f.width, f.height, {
    samplingMode: 'all-layers',
    colorAdaptation: 0,
    rotation: 0,
    scale: 100,
    mirror: false,
  }).pixels;
  const adapted = contentAwareFill(f.pixels, f.mask, f.width, f.height, {
    samplingMode: 'rectangular',
    sampleRect: { x: 0, y: 0, w: 7, h: 2 },
    colorAdaptation: 100,
    rotation: 90,
    scale: 175,
    mirror: true,
  }).pixels;
  assert.notDeepEqual([...adapted], [...base]);
  assert.deepEqual(
    [...adapted],
    [
      ...contentAwareFill(f.pixels, f.mask, f.width, f.height, {
        samplingMode: 'rectangular',
        sampleRect: { x: 0, y: 0, w: 7, h: 2 },
        colorAdaptation: 100,
        rotation: 90,
        scale: 175,
        mirror: true,
      }).pixels,
    ],
  );
});

void test('empty selections and unusable sampling regions fail explicitly', () => {
  const f = fixture();
  assert.throws(
    () =>
      contentAwareFill(
        f.pixels,
        new Uint8ClampedArray(f.mask.length),
        f.width,
        f.height,
        {
          samplingMode: 'auto',
          colorAdaptation: 0,
          rotation: 0,
          scale: 100,
          mirror: false,
        },
      ),
    /requires a selection/,
  );
  assert.throws(
    () =>
      contentAwareFill(f.pixels, f.mask, f.width, f.height, {
        samplingMode: 'rectangular',
        sampleRect: { x: 2, y: 1, w: 3, h: 3 },
        colorAdaptation: 0,
        rotation: 0,
        scale: 100,
        mirror: false,
      }),
    /No usable pixels/,
  );
});
