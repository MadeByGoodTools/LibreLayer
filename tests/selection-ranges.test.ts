import assert from 'node:assert/strict';
import test from 'node:test';
import {
  colorSimilarityWeight,
  focusWeight,
  luminosityRangeWeight,
} from '../lib/selection-ranges.ts';

void test('luminosity ranges favor shadows, midtones, and highlights independently', () => {
  assert.ok(luminosityRangeWeight(20, 'shadows') > 0.9);
  assert.ok(luminosityRangeWeight(128, 'midtones') > 0.9);
  assert.ok(luminosityRangeWeight(235, 'highlights') > 0.9);
  assert.ok(luminosityRangeWeight(235, 'shadows') < 0.05);
});

void test('color similarity produces a feathered tolerance instead of a hard edge', () => {
  const target = [100, 120, 140] as const;
  assert.equal(colorSimilarityWeight(100, 120, 140, target, 30), 1);
  const near = colorSimilarityWeight(110, 130, 150, target, 30);
  assert.ok(near > 0 && near < 1);
  assert.equal(colorSimilarityWeight(220, 220, 220, target, 30), 0);
});

void test('focus range detects a sharp edge and ignores a flat field', () => {
  const width = 7,
    height = 7,
    pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4,
        value = x < 4 ? 10 : 245;
      pixels[index] = pixels[index + 1] = pixels[index + 2] = value;
      pixels[index + 3] = 255;
    }
  assert.ok(focusWeight(pixels, width, height, 3, 3, 20) > 0.8);
  assert.equal(focusWeight(pixels, width, height, 1, 3, 20), 0);
});
