import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createHdrPreviewPixels,
  normalizeHdrPreviewMode,
} from '../lib/hdr-display.ts';

void test('extended HDR preview retains encoded values above display white', () => {
  const result = createHdrPreviewPixels(
    new Float32Array([4, 0.18, 0.5, 1]),
    'auto',
    true,
  );
  assert.equal(result.extended, true);
  assert.ok(result.pixels[0] > 1);
  assert.equal(result.pixels[3], 1);
});

void test('SDR fallback tone maps highlights into a bounded display range', () => {
  const result = createHdrPreviewPixels(
    new Float32Array([4, 0.18, 0.5, 1]),
    'auto',
    false,
  );
  assert.equal(result.extended, false);
  assert.ok(result.pixels[0] < 1);
  assert.ok(result.pixels[0] > result.pixels[2]);
});

void test('highlight preview marks only scene values above one', () => {
  const result = createHdrPreviewPixels(
    new Float32Array([2, 0.1, 0.1, 1, 0.5, 0.25, 0.1, 1]),
    'highlights',
    true,
  );
  assert.deepEqual(Array.from(result.pixels.slice(0, 2)), [1, 0]);
  assert.ok(Math.abs(result.pixels[2] - 0.65) < 1e-6);
  assert.notDeepEqual(Array.from(result.pixels.slice(4, 7)), [1, 0, 0.65]);
});

void test('HDR preview preferences fail safely to automatic mode', () => {
  assert.equal(normalizeHdrPreviewMode('sdr'), 'sdr');
  assert.equal(normalizeHdrPreviewMode('highlights'), 'highlights');
  assert.equal(normalizeHdrPreviewMode('unsafe'), 'auto');
});
