import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasSmartObjectTransform,
  isSmartObjectTransform,
  normalizeSmartObjectTransform,
} from '../lib/smart-object-transform.ts';

void test('Smart Object distortion recipes validate and normalize', () => {
  const recipe = {
    mode: 'perspective-warp' as const,
    horizontal: 24,
    vertical: -11,
  };
  assert.equal(isSmartObjectTransform(recipe), true);
  assert.deepEqual(normalizeSmartObjectTransform(recipe), recipe);
  assert.equal(hasSmartObjectTransform(recipe), true);
});

void test('Smart Object distortion rejects invalid persisted recipes', () => {
  assert.equal(
    isSmartObjectTransform({ mode: 'unknown', horizontal: 0, vertical: 0 }),
    false,
  );
  assert.equal(
    isSmartObjectTransform({ mode: 'skew', horizontal: 101, vertical: 0 }),
    false,
  );
  assert.equal(
    isSmartObjectTransform({
      mode: 'preset-warp',
      horizontal: 12,
      vertical: 0,
      preset: 'bad',
    }),
    false,
  );
});

void test('identity recipes avoid unnecessary pixel remapping', () => {
  assert.equal(
    hasSmartObjectTransform(normalizeSmartObjectTransform()),
    false,
  );
});
