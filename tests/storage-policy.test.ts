import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeVersionRetention,
  saveLocationStatus,
} from '../lib/storage-policy.ts';

void test('version retention stays inside the supported local range', () => {
  assert.equal(normalizeVersionRetention(undefined), 12);
  assert.equal(normalizeVersionRetention(1), 2);
  assert.equal(normalizeVersionRetention(25.4), 25);
  assert.equal(normalizeVersionRetention(1000), 50);
});

void test('save-location health always states its safe fallback', () => {
  assert.equal(
    saveLocationStatus('Photo SSD', 'connected'),
    'Photo SSD · connected and writable',
  );
  assert.match(saveLocationStatus('Photo SSD', 'unavailable'), /Downloads/);
  assert.match(
    saveLocationStatus('Photo SSD', 'permission-needed'),
    /reconnect or re-authorize/,
  );
});
