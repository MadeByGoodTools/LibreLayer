import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clippingBaseId,
  groupCanPassThrough,
} from '../lib/group-compositing.ts';

const neutralGroup = {
  opacity: 100,
  blend: 'source-over',
  hasMask: false,
  x: 0,
  y: 0,
};

void test('neutral pass-through groups do not isolate their children', () => {
  assert.equal(groupCanPassThrough(neutralGroup), true);
  assert.equal(
    groupCanPassThrough({ ...neutralGroup, groupIsolation: 'isolated' }),
    false,
  );
  assert.equal(groupCanPassThrough({ ...neutralGroup, opacity: 90 }), false);
  assert.equal(groupCanPassThrough({ ...neutralGroup, hasMask: true }), false);
});

void test('nested clipping finds the first non-clipped sibling below', () => {
  const siblings = [
    { id: 'top', clipping: true },
    { id: 'middle', clipping: true },
    { id: 'base' },
    { id: 'lower' },
  ];
  assert.equal(clippingBaseId(siblings, 'top'), 'base');
  assert.equal(clippingBaseId(siblings, 'middle'), 'base');
  assert.equal(clippingBaseId(siblings, 'base'), 'lower');
  assert.equal(clippingBaseId(siblings, 'missing'), undefined);
});
