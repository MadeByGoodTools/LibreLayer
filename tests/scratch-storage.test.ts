import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeScratchQuota,
  scratchFileName,
  selectScratchEvictions,
} from '../lib/scratch-storage.ts';

void test('scratch keys cannot escape the managed namespace', () => {
  assert.equal(scratchFileName('../../job 1'), '.librelayer-scratch-------job-1.bin');
  assert.match(scratchFileName('safe_JOB-2'), /^\.librelayer-scratch-[a-z0-9_-]+\.bin$/i);
});

void test('scratch quota stays within supported bounds', () => {
  assert.equal(normalizeScratchQuota('bad'), 1024);
  assert.equal(normalizeScratchQuota(1), 128);
  assert.equal(normalizeScratchQuota(9000), 8192);
});

void test('oldest scratch files are evicted until an operation fits', () => {
  const files = [
    { name: 'new', size: 40, updated: 30 },
    { name: 'old', size: 40, updated: 10 },
    { name: 'middle', size: 40, updated: 20 },
  ];
  assert.deepEqual(
    selectScratchEvictions(files, 50, 100).map((file) => file.name),
    ['old', 'middle'],
  );
});
