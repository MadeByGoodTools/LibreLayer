import assert from 'node:assert/strict';
import test from 'node:test';
import {
  autoBlendStack,
  estimateTranslation,
  focusStack,
  mergeHdrStack,
  statisticalStack,
  toneMapHdr,
} from '../lib/stack-engine.ts';

const pixel = (gray: number) => [gray, gray, gray, 255];

void test('translation alignment recovers an integer offset', () => {
  const width = 7,
    height = 5,
    reference = new Uint8ClampedArray(width * height * 4),
    target = new Uint8ClampedArray(width * height * 4);
  for (let y = 1; y < 4; y++)
    for (let x = 1; x < 5; x++) {
      reference.set(pixel(30 + x * 20 + y * 7), (y * width + x) * 4);
      target.set(pixel(30 + x * 20 + y * 7), (y * width + x + 1) * 4);
    }
  const result = estimateTranslation(reference, target, width, height, 2);
  assert.equal(result.x, -1);
  assert.equal(result.y, 0);
});

void test('coarse-to-fine alignment recovers a larger offset', () => {
  const width = 48,
    height = 40,
    reference = new Uint8ClampedArray(width * height * 4),
    target = new Uint8ClampedArray(width * height * 4);
  for (let y = 8; y < 27; y++)
    for (let x = 7; x < 31; x++) {
      const value = (x * 17 + y * 29 + x * y * 3) % 255;
      reference.set(pixel(value), (y * width + x) * 4);
      target.set(pixel(value), ((y - 5) * width + x + 7) * 4);
    }
  const result = estimateTranslation(reference, target, width, height, 12);
  assert.equal(result.x, -7);
  assert.equal(result.y, 5);
});

void test('statistical stack modes return exact reference values', () => {
  const sources = [10, 40, 100].map((value) => new Uint8ClampedArray(pixel(value)));
  assert.equal(statisticalStack(sources, 1, 1, 'mean')[0], 50);
  assert.equal(statisticalStack(sources, 1, 1, 'median')[0], 40);
  assert.equal(statisticalStack(sources, 1, 1, 'minimum')[0], 10);
  assert.equal(statisticalStack(sources, 1, 1, 'maximum')[0], 100);
  assert.equal(statisticalStack(sources, 1, 1, 'range')[0], 90);
});

void test('focus stack selects the locally sharper source', () => {
  const flat = new Uint8ClampedArray([...pixel(50), ...pixel(50), ...pixel(50)]),
    sharp = new Uint8ClampedArray([...pixel(0), ...pixel(180), ...pixel(0)]),
    result = focusStack([flat, sharp], 3, 1);
  assert.equal(result[4], 180);
});

void test('Auto-Blend favors well-exposed detail and preserves alpha', () => {
  const dark = new Uint8ClampedArray(pixel(10)),
    middle = new Uint8ClampedArray(pixel(128)),
    bright = new Uint8ClampedArray(pixel(250)),
    result = autoBlendStack([dark, middle, bright], 1, 1);
  assert.ok(result[0] > 90 && result[0] < 170);
  assert.equal(result[3], 255);
});

void test('HDR merge retains scene values until explicit tone mapping', () => {
  const sources = [new Uint8ClampedArray(pixel(64)), new Uint8ClampedArray(pixel(200))],
    hdr = mergeHdrStack(sources, 1, 1, [-2, 1]);
  assert.ok(hdr instanceof Float32Array);
  assert.ok(hdr[0] > 0);
  const display = toneMapHdr(hdr);
  assert.equal(display.length, 4);
  assert.equal(display[3], 255);
});
