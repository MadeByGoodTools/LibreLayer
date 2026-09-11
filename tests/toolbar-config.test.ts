import test from 'node:test';
import assert from 'node:assert/strict';
import {
  moveToolbarItem,
  normalizeToolbar,
  visibleToolbarIds,
} from '../lib/toolbar-config.ts';

void test('toolbar preferences reject unknown and duplicate tools', () => {
  assert.deepEqual(
    normalizeToolbar(['move', 'brush', 'text'], {
      order: ['brush', 'unknown', 'brush'],
      hidden: ['unknown', 'text', 'text'],
    }),
    {
      order: ['brush', 'move', 'text'],
      hidden: ['text'],
      groupByFamily: true,
    },
  );
});

void test('toolbar order moves one bounded position at a time', () => {
  const toolbar = normalizeToolbar(['move', 'brush', 'text']);
  assert.deepEqual(moveToolbarItem(toolbar, 'brush', -1).order, [
    'brush',
    'move',
    'text',
  ]);
  assert.equal(moveToolbarItem(toolbar, 'move', -1), toolbar);
});

void test('hidden tools remain available outside the visible toolbar', () => {
  const toolbar = normalizeToolbar(['move', 'brush', 'text'], {
    hidden: ['brush'],
  });
  assert.deepEqual(visibleToolbarIds(toolbar), ['move', 'text']);
  assert.deepEqual(toolbar.order, ['move', 'brush', 'text']);
});
