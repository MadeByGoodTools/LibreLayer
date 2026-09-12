import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canvasFont,
  canvasFontStretch,
  canvasVariableFont,
  graphemes,
  resolveTextDirection,
  shouldDrawShapedRun,
  fitTextSize,
  layoutGlyphsOnPath,
  textWarpTransform,
} from '../lib/text-engine.ts';

void test('automatic direction recognizes right-to-left scripts', () => {
  assert.equal(resolveTextDirection('Hello world', 'auto'), 'ltr');
  assert.equal(resolveTextDirection('مرحبا بالعالم', 'auto'), 'rtl');
  assert.equal(resolveTextDirection('שלום', 'ltr'), 'ltr');
});

void test('canvas font preserves variable weight, width, style, and spaced family', () => {
  assert.equal(
    canvasFont({
      family: 'Source Sans Variable',
      size: 32,
      weight: 525,
      style: 'italic',
    }),
    'italic 525 32px "Source Sans Variable"',
  );
  assert.equal(canvasFontStretch(87), 'semi-condensed');
  assert.equal(
    canvasVariableFont({
      family: 'Source Sans Variable',
      size: 32,
      weight: 525,
      stretch: 87,
      style: 'italic',
    }),
    'italic 525 87% 32px "Source Sans Variable"',
  );
});

void test('grapheme segmentation keeps emoji and combining marks together', () => {
  assert.deepEqual(graphemes('Á👩‍💻'), ['Á', '👩‍💻']);
});

void test('unmodified lines use the native shaping path', () => {
  assert.equal(
    shouldDrawShapedRun({ tracking: 0, justifyExtra: 0, onPath: false, warp: 0 }),
    true,
  );
  assert.equal(
    shouldDrawShapedRun({ tracking: 1, justifyExtra: 0, onPath: false, warp: 0 }),
    false,
  );
});

void test('glyph advances follow real polyline distance and tangent', () => {
  const result = layoutGlyphsOnPath(
    [10, 10, 10],
    [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
    ],
  );
  assert.deepEqual(result[0], { x: 5, y: 0, angle: 0, visible: true });
  assert.deepEqual(result[2], {
    x: 20,
    y: 5,
    angle: Math.PI / 2,
    visible: true,
  });
});

void test('dynamic text fitting finds the largest bounded size that fits', () => {
  const size = fitTextSize({
    preferred: 48,
    min: 8,
    max: 72,
    fits: (candidate) => candidate <= 31,
  });
  assert.ok(size > 30.9 && size <= 31);
});

void test('named text warps produce distinct bounded transforms', () => {
  const arc = textWarpTransform('arc', 0.5, 40),
    flag = textWarpTransform('flag', 0.5, 40),
    bulge = textWarpTransform('bulge', 0.5, 40);
  assert.notDeepEqual(arc, flag);
  assert.equal(arc.y, -40);
  assert.equal(bulge.scaleY, 1.4);
});
