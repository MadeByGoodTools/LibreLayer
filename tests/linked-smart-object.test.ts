import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLinkedFile } from '../lib/linked-smart-object.ts';
import type { LinkedFileHandleRecord } from '../lib/recovery.ts';

const record = (
  query: PermissionState,
  request: PermissionState,
): LinkedFileHandleRecord => ({
  id: 'linked:layer-1',
  name: 'source.png',
  updated: 1,
  handle: {
    name: 'source.png',
    queryPermission: async () => query,
    requestPermission: async () => request,
    getFile: async () => new File(['pixels'], 'source.png', { type: 'image/png' }),
  },
});

void test('linked files reopen directly when permission remains granted', async () => {
  const resolved = await resolveLinkedFile(record('granted', 'denied'));
  assert.equal(resolved.name, 'source.png');
  assert.equal(resolved.file.name, 'source.png');
});

void test('linked files request permission again after reconnecting', async () => {
  const resolved = await resolveLinkedFile(record('prompt', 'granted'));
  assert.equal(await resolved.file.text(), 'pixels');
});

void test('missing and denied links fail explicitly', async () => {
  await assert.rejects(() => resolveLinkedFile(null), /unavailable/);
  await assert.rejects(
    () => resolveLinkedFile(record('denied', 'denied')),
    /not granted/,
  );
});

