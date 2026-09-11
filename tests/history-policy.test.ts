import test from 'node:test';
import assert from 'node:assert/strict';
import {
  historyExceedsPolicy,
  normalizeHistoryPolicy,
} from '../lib/history-policy.ts';

void test('history preferences are normalized to safe persisted limits', () => {
  assert.deepEqual(normalizeHistoryPolicy(2, 50), { depth: 5, budgetMb: 128 });
  assert.deepEqual(normalizeHistoryPolicy(500, 9000), {
    depth: 100,
    budgetMb: 2048,
  });
  assert.deepEqual(normalizeHistoryPolicy(undefined, undefined), {
    depth: 32,
    budgetMb: 512,
  });
});

void test('compaction responds independently to depth and memory pressure', () => {
  const policy = { depth: 40, budgetMb: 256 };
  assert.equal(historyExceedsPolicy(41, 1, policy), true);
  assert.equal(historyExceedsPolicy(2, 257 * 1048576, policy), true);
  assert.equal(historyExceedsPolicy(40, 256 * 1048576, policy), false);
});
