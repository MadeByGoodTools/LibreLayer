import test from 'node:test';
import assert from 'node:assert/strict';
import {
  motionClassName,
  normalizeMotionPreference,
} from '../lib/accessibility-preferences.ts';

void test('motion preference keeps explicit accessible choices', () => {
  assert.equal(normalizeMotionPreference('system'), 'system');
  assert.equal(normalizeMotionPreference('reduced'), 'reduced');
  assert.equal(normalizeMotionPreference('full'), 'full');
});

void test('invalid motion preferences safely follow the operating system', () => {
  assert.equal(normalizeMotionPreference('spin'), 'system');
  assert.equal(normalizeMotionPreference(null), 'system');
  assert.equal(motionClassName(undefined), 'motion-system');
});
