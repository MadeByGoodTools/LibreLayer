import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyColorGradeToPixels,
  colorGradeIsNeutral,
  createDefaultColorGrade,
  resolveColorGrade,
} from '../lib/channel-grade.ts';

void test('neutral channel grade leaves pixels unchanged', () => {
  const pixels = new Uint8ClampedArray([24, 96, 180, 220]);
  applyColorGradeToPixels(pixels, createDefaultColorGrade());
  assert.deepEqual([...pixels], [24, 96, 180, 220]);
  assert.equal(colorGradeIsNeutral(createDefaultColorGrade()), true);
});

void test('individual levels alter only their selected color channel', () => {
  const grade = createDefaultColorGrade();
  grade.levels.red.outputWhite = 96;
  const pixels = new Uint8ClampedArray([255, 140, 80, 210]);
  applyColorGradeToPixels(pixels, grade);
  assert.deepEqual([...pixels], [96, 140, 80, 210]);
});

void test('alpha levels are independently adjustable', () => {
  const grade = createDefaultColorGrade();
  grade.levels.alpha.outputWhite = 128;
  const pixels = new Uint8ClampedArray([20, 40, 60, 255]);
  applyColorGradeToPixels(pixels, grade);
  assert.deepEqual([...pixels], [20, 40, 60, 128]);
});

void test('color grading separates shadows from highlights', () => {
  const grade = createDefaultColorGrade();
  grade.shadows.blue = 100;
  grade.highlights.red = 100;
  const pixels = new Uint8ClampedArray([24, 24, 24, 255, 230, 230, 230, 255]);
  applyColorGradeToPixels(pixels, grade);
  assert.ok(pixels[2] > pixels[0]);
  assert.ok(pixels[4] > pixels[6]);
});

void test('persisted grades are clamped to safe channel ranges', () => {
  const grade = resolveColorGrade({
    temperature: 900,
    levels: {
      red: {
        inputBlack: 254,
        inputWhite: 2,
        gamma: 0,
        outputBlack: -30,
        outputWhite: 400,
      },
    },
  } as never);
  assert.equal(grade.temperature, 100);
  assert.deepEqual(grade.levels.red, {
    inputBlack: 254,
    inputWhite: 255,
    gamma: 0.1,
    outputBlack: 0,
    outputWhite: 255,
  });
});
