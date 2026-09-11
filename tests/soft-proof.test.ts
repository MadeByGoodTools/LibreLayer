import assert from 'node:assert/strict';
import test from 'node:test';
import { isProofGamutWarning } from '../lib/soft-proof.ts';

void test('working RGB never displays proof gamut warnings', () => {
  assert.equal(isProofGamutWarning(255, 0, 0, 'none'), false);
});

void test('grayscale proof warns for chromatic but not neutral pixels', () => {
  assert.equal(isProofGamutWarning(220, 40, 40, 'grayscale'), true);
  assert.equal(isProofGamutWarning(120, 120, 120, 'grayscale'), false);
});

void test('CMYK proof warns for extreme saturated display colors', () => {
  assert.equal(isProofGamutWarning(255, 0, 0, 'cmyk'), true);
  assert.equal(isProofGamutWarning(130, 110, 100, 'cmyk'), false);
});
