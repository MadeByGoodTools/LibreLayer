import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeHistogram } from '../lib/histogram.ts';

void test('histogram separates RGB and luminance bins', () => {
  const histogram = analyzeHistogram(
    new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]),
  );
  assert.equal(histogram.red[255], 1);
  assert.equal(histogram.red[0], 1);
  assert.equal(histogram.green[255], 1);
  assert.equal(histogram.luminance[54], 1);
  assert.equal(histogram.luminance[182], 1);
  assert.equal(histogram.opaquePixels, 2);
});

void test('histogram ignores transparent pixels and reports clipping', () => {
  const histogram = analyzeHistogram(
    new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255, 200, 200, 200, 0]),
  );
  assert.equal(histogram.opaquePixels, 2);
  assert.equal(histogram.shadowClipped, 1);
  assert.equal(histogram.highlightClipped, 1);
});

void test('histogram rejects incomplete pixels', () => {
  assert.throws(
    () => analyzeHistogram(new Uint8ClampedArray([1, 2, 3])),
    /complete RGBA/,
  );
});
