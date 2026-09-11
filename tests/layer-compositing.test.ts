import assert from 'node:assert/strict';
import test from 'node:test';
import {
  blendChannel,
  blendRgb,
  blendRgbInSpace,
  pixelBlendModes,
} from '../lib/layer-compositing.ts';

void test('separable blend modes match their reference equations', () => {
  const close = (actual: number, expected: number) =>
    assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} ≠ ${expected}`);
  close(blendChannel(0.25, 0.8, 'multiply'), 0.2);
  close(blendChannel(0.25, 0.8, 'screen'), 0.85);
  close(blendChannel(0.25, 0.8, 'overlay'), 0.4);
  close(blendChannel(0.25, 0.8, 'hard-light'), 0.7);
  close(blendChannel(0.25, 0.8, 'difference'), 0.55);
  close(blendChannel(0.25, 0.8, 'exclusion'), 0.65);
});

void test('all Photoshop-style blend families use the reference pixel path', () => {
  for (const mode of [
    'multiply',
    'screen',
    'color-burn',
    'color-dodge',
    'soft-light',
    'hue',
    'saturation',
    'color',
    'luminosity',
    'linear-light',
    'hard-mix',
  ])
    assert.equal(pixelBlendModes.has(mode), true, mode);
});

void test('nonseparable color mode preserves backdrop luminance', () => {
  const backdrop = [0.2, 0.5, 0.8],
    source = [0.9, 0.2, 0.1],
    result = blendRgb(backdrop, source, 'color'),
    luminance = (rgb: number[]) => 0.3 * rgb[0] + 0.59 * rgb[1] + 0.11 * rgb[2];
  assert.ok(Math.abs(luminance(result) - luminance(backdrop)) < 1e-12);
});

void test('linear-light calculation differs from gamma blending predictably', () => {
  const gamma = blendRgbInSpace(
    [0.5, 0.5, 0.5],
    [0.5, 0.5, 0.5],
    'multiply',
    'gamma',
  );
  const linear = blendRgbInSpace(
    [0.5, 0.5, 0.5],
    [0.5, 0.5, 0.5],
    'multiply',
    'linear',
  );
  assert.equal(gamma[0], 0.25);
  assert.ok(linear[0] > 0.23 && linear[0] < 0.24);
  assert.notEqual(linear[0], gamma[0]);
});
