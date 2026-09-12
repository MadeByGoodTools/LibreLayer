import assert from 'node:assert/strict';
import test from 'node:test';
import { createStoreZip } from '../lib/zip.ts';

void test('store ZIP contains valid local, central, and end records', () => {
  const zip = createStoreZip([
      { name: 'first.txt', data: new TextEncoder().encode('one') },
      { name: 'folder/second.txt', data: new TextEncoder().encode('two') },
    ]),
    view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength),
    text = new TextDecoder().decode(zip);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(zip.length - 22, true), 0x06054b50);
  assert.match(text, /first\.txt/);
  assert.match(text, /folder\/second\.txt/);
});
