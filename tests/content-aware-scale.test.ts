import test from 'node:test';
import assert from 'node:assert/strict';
import { contentAwareScale } from '../lib/content-aware-scale.ts';

const stripedFixture = () => {
  const width = 8,
    height = 4,
    data = new Uint8ClampedArray(width * height * 4),
    mask = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x,
        offset = pixel * 4,
        subject = x === 3 || x === 4;
      data.set(subject ? [240, 30, 20, 255] : [40, 70, 100, 255], offset);
      if (subject) mask[pixel] = 255;
    }
  return { width, height, data, mask };
};

void test('content-aware scaling produces exact requested dimensions', () => {
  const source = stripedFixture(),
    result = contentAwareScale(source, 5, 7, source.mask);
  assert.equal(result.width, 5);
  assert.equal(result.height, 7);
  assert.equal(result.data.length, 5 * 7 * 4);
});

void test('a protected detailed subject survives strong horizontal compression', () => {
  const source = stripedFixture(),
    protectedResult = contentAwareScale(source, 4, 4, source.mask),
    redPixels = [...Array(protectedResult.width * protectedResult.height)].filter(
      (_, pixel) =>
        protectedResult.data[pixel * 4] >
        protectedResult.data[pixel * 4 + 2] * 1.5,
    ).length;
  assert.ok(redPixels >= protectedResult.height);
});

void test('neutral dimensions are a lossless copy and invalid inputs fail', () => {
  const source = stripedFixture(),
    copy = contentAwareScale(source, source.width, source.height);
  assert.notEqual(copy.data, source.data);
  assert.deepEqual(copy.data, source.data);
  assert.throws(() => contentAwareScale(source, 0, 4), /positive/);
  assert.throws(
    () => contentAwareScale(source, 4, 4, new Uint8ClampedArray(3)),
    /mask dimensions/,
  );
});
