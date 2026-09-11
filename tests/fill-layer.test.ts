import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultFillLayerRecipe,
  normalizeFillLayerRecipe,
  patternUsesSecondary,
} from '../lib/fill-layer.ts';

void test('native fill recipes round-trip all editable settings', () => {
  const recipe = normalizeFillLayerRecipe({
    mode: 'gradient',
    color: '#ABCDEF',
    color2: '#102030',
    angle: 405,
    scale: 175,
    offsetX: -30,
    offsetY: 42,
    pattern: 'stripes',
  });
  assert.deepEqual(recipe, {
    mode: 'gradient',
    color: '#abcdef',
    color2: '#102030',
    angle: 45,
    scale: 175,
    offsetX: -30,
    offsetY: 42,
    pattern: 'stripes',
  });
});

void test('invalid fill settings recover to bounded defaults', () => {
  const recipe = normalizeFillLayerRecipe({
    mode: 'pattern',
    color: 'transparent',
    angle: Number.NaN,
    scale: 900,
    offsetX: -900,
  });
  assert.equal(recipe.color, defaultFillLayerRecipe().color);
  assert.equal(recipe.angle, 45);
  assert.equal(recipe.scale, 400);
  assert.equal(recipe.offsetX, -100);
});

void test('checker, dot, and stripe patterns produce both recipe colors', () => {
  for (const pattern of ['checker', 'dots', 'stripes'] as const) {
    const samples = Array.from({ length: 24 }, (_, y) =>
      Array.from({ length: 24 }, (_, x) =>
        patternUsesSecondary(x, y, { mode: 'pattern', pattern, scale: 50 }),
      ),
    ).flat();
    assert.ok(samples.includes(true), `${pattern} includes secondary color`);
    assert.ok(samples.includes(false), `${pattern} includes primary color`);
  }
});
