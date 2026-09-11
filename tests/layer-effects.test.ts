import assert from 'node:assert/strict';
import test from 'node:test';
import {
  effectContourAlpha,
  effectOffset,
  normalizeLayerEffects,
} from '../lib/layer-effects.ts';

void test('layer effect recipes retain contour, global light, and scale', () => {
  const effects = normalizeLayerEffects({
    contour: 'ring',
    useGlobalLight: false,
    angle: 42,
    scale: 175,
    size: 24,
    distance: 18,
  });
  assert.equal(effects.contour, 'ring');
  assert.equal(effects.useGlobalLight, false);
  assert.equal(effects.angle, 42);
  assert.equal(effects.scale, 175);
});

void test('global-light vector scales distance at the selected angle', () => {
  const offset = effectOffset(180, 20, 150);
  assert.ok(Math.abs(offset.x - 30) < 1e-9);
  assert.ok(Math.abs(offset.y) < 1e-9);
});

void test('effect contours provide distinct bounded alpha curves', () => {
  const linear = effectContourAlpha(0.25, 'linear'),
    smooth = effectContourAlpha(0.25, 'smooth'),
    cone = effectContourAlpha(0.25, 'cone'),
    ring = effectContourAlpha(0.25, 'ring');
  assert.equal(linear, 0.25);
  assert.ok(smooth >= 0 && smooth <= 1);
  assert.ok(cone >= 0 && cone <= 1);
  assert.ok(ring >= 0 && ring <= 1);
  assert.equal(new Set([linear, smooth, cone, ring]).size, 4);
});

void test('invalid effect recipes recover to safe limits', () => {
  const effects = normalizeLayerEffects({
    color: 'bad',
    opacity: 200,
    angle: Number.NaN,
    scale: 0,
    contour: 'linear',
  });
  assert.equal(effects.color, '#000000');
  assert.equal(effects.opacity, 100);
  assert.equal(effects.angle, 135);
  assert.equal(effects.scale, 1);
});
