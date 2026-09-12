import assert from 'node:assert/strict';
import test from 'node:test';
import {
  captureWorkingSurface,
  cloneWorkingSurface,
  convertWorkingSurface,
  deserializeWorkingSurface,
  readWorkingChannel,
  resizeWorkingSurface,
  serializeWorkingSurface,
  syncWorkingSurfaceFromRgba8,
  workingSurfaceFromRgba8,
  workingSurfaceToRgba8,
  writeWorkingChannel,
  placeWorkingSurface,
} from '../lib/working-depth.ts';

const rgba = new Uint8ClampedArray([18, 52, 86, 255, 120, 140, 160, 128]);

void test('16-bit integer surfaces retain values between adjacent display steps', () => {
  const surface = workingSurfaceFromRgba8(rgba, 2, 1, '16u');
  writeWorkingChannel(surface, 0, 18.4 / 255);
  assert.equal(workingSurfaceToRgba8(surface)[0], 18);
  assert.ok(readWorkingChannel(surface, 0) > 18 / 255);
  assert.ok(readWorkingChannel(surface, 0) < 19 / 255);
});

void test('half-float and 32-bit surfaces preserve scene values above display white', () => {
  for (const depth of ['16f', '32f'] as const) {
    const surface = workingSurfaceFromRgba8(rgba, 2, 1, depth);
    writeWorkingChannel(surface, 1, 3.25);
    assert.equal(readWorkingChannel(surface, 1), 3.25);
    assert.equal(workingSurfaceToRgba8(surface)[1], 255);
  }
});

void test('display edits update only changed channels and preserve hidden precision', () => {
  const surface = workingSurfaceFromRgba8(rgba, 2, 1, '32f');
  writeWorkingChannel(surface, 0, 18.25 / 255);
  writeWorkingChannel(surface, 1, 52.4 / 255);
  const display = workingSurfaceToRgba8(surface);
  display[1] = 90;
  assert.equal(syncWorkingSurfaceFromRgba8(surface, display), 1);
  assert.ok(Math.abs(readWorkingChannel(surface, 0) - 18.25 / 255) < 1e-7);
  assert.ok(Math.abs(readWorkingChannel(surface, 1) - 90 / 255) < 1e-7);
});

void test('working-depth conversion and cloning do not share mutable buffers', () => {
  const source = workingSurfaceFromRgba8(rgba, 2, 1, '32f'),
    converted = convertWorkingSurface(source, '16u'),
    cloned = cloneWorkingSurface(converted);
  writeWorkingChannel(cloned, 0, 1);
  assert.notEqual(
    readWorkingChannel(cloned, 0),
    readWorkingChannel(converted, 0),
  );
  assert.deepEqual(workingSurfaceToRgba8(converted), rgba);
});

void test('history capture deduplicates unchanged precision buffers', () => {
  const surface = workingSurfaceFromRgba8(rgba, 2, 1, '16u'),
    first = captureWorkingSurface(surface),
    second = captureWorkingSurface(surface, first);
  assert.equal(second, first);
  writeWorkingChannel(surface, 0, 0.9);
  assert.notEqual(captureWorkingSurface(surface, first), first);
});

void test('all high-depth formats serialize portably and reject truncated data', () => {
  for (const depth of ['16u', '16f', '32f'] as const) {
    const source = workingSurfaceFromRgba8(rgba, 2, 1, depth);
    writeWorkingChannel(source, 2, depth === '16u' ? 0.4242 : 1.4242);
    const stored = serializeWorkingSurface(source),
      restored = deserializeWorkingSurface(stored);
    assert.equal(restored.depth, depth);
    assert.ok(
      Math.abs(
        readWorkingChannel(restored, 2) - readWorkingChannel(source, 2),
      ) < 1e-6,
    );
    assert.throws(
      () =>
        deserializeWorkingSurface({ ...stored, data: stored.data.slice(4) }),
      /wrong size|Invalid base64/,
    );
  }
});

void test('high-depth resize and canvas placement avoid an 8-bit intermediate', () => {
  const source = workingSurfaceFromRgba8(
    new Uint8ClampedArray([10, 20, 30, 255, 200, 210, 220, 255]),
    2,
    1,
    '32f',
  );
  writeWorkingChannel(source, 0, 2.5);
  const resized = resizeWorkingSurface(source, 4, 1, 'nearest');
  assert.equal(readWorkingChannel(resized, 0), 2.5);
  const placed = placeWorkingSurface(resized, 6, 2, 1, 1);
  assert.equal(readWorkingChannel(placed, (1 * 6 + 1) * 4), 2.5);
  assert.equal(readWorkingChannel(placed, 0), 0);
});
