import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canvasFont,
  canvasFontStretch,
  canvasVariableFont,
  graphemes,
  resolveTextDirection,
  shouldDrawShapedRun,
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
