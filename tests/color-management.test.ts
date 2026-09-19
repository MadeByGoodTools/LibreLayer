import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COLOR_PROFILES,
  convertColor,
  convertRgba,
  normalizeColorProfile,
  normalizeRenderingIntent,
} from '../lib/color-management.ts';

void test('color profiles expose versioned professional RGB spaces', () => {
  assert.deepEqual(
    Object.values(COLOR_PROFILES).map(({ id, version }) => [id, version]),
    [
      ['srgb', 4],
      ['display-p3', 4],
      ['adobe-rgb', 2],
      ['prophoto-rgb', 2],
    ],
  );
  assert.equal(normalizeColorProfile('missing'), 'srgb');
  assert.equal(normalizeRenderingIntent('perceptual'), 'perceptual');
  assert.equal(normalizeRenderingIntent('missing'), 'relative-colorimetric');
});

void test('profile conversion preserves neutral appearance and round trips', () => {
  const source = [0.22, 0.5, 0.81] as const,
    p3 = convertColor(source, 'srgb', 'display-p3'),
    restored = convertColor(p3, 'display-p3', 'srgb');
  restored.forEach((value, index) =>
    assert.ok(Math.abs(value - source[index]) < 0.012),
  );
  const neutral = convertColor(
    [0.5, 0.5, 0.5],
    'prophoto-rgb',
    'srgb',
    'relative-colorimetric',
    false,
  );
  assert.ok(Math.max(...neutral) - Math.min(...neutral) < 0.002);
});

void test('rendering intents produce bounded display output while preserving alpha', () => {
  const source = new Uint8ClampedArray([255, 16, 180, 91]);
  for (const intent of ['perceptual', 'saturation'] as const) {
    const output = convertRgba(source, 'display-p3', 'srgb', intent, true);
    assert.ok(output[0] >= 0 && output[0] <= 255);
    assert.ok(output[1] >= 0 && output[1] <= 255);
    assert.ok(output[2] >= 0 && output[2] <= 255);
    assert.equal(output[3], 91);
  }
});

void test('floating-point conversion retains extended range for high-depth documents', () => {
  const source = new Float32Array([1.25, 0.4, 0.1, 0.75]),
    output = convertRgba(
      source,
      'display-p3',
      'prophoto-rgb',
      'relative-colorimetric',
      false,
    );
  assert.ok(output instanceof Float32Array);
  assert.equal(output[3], 0.75);
  assert.ok(output.every(Number.isFinite));
});
