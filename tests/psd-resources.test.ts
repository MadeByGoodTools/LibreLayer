import assert from 'node:assert/strict';
import test from 'node:test';
import { writePsd } from 'ag-psd';
import {
  extractPsdResources,
  mergeMissingPsdResources,
} from '../lib/psd-resources.ts';

const block = (id: number, payload: number[]) => {
  const output = new Uint8Array(12 + payload.length + (payload.length % 2)),
    view = new DataView(output.buffer);
  output.set(new TextEncoder().encode('8BIM'));
  view.setUint16(4, id, false);
  view.setUint32(8, payload.length, false);
  output.set(payload, 12);
  return output;
};

void test('unknown PSD metadata resource blocks survive exact round trips', () => {
  const imageData = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([1, 2, 3, 255]),
    },
    source = writePsd({ width: 1, height: 1, imageData }),
    proprietary = block(0x1234, [9, 8, 7, 6, 5]),
    withMetadata = mergeMissingPsdResources(source, [proprietary]),
    preserved = extractPsdResources(withMetadata),
    rewritten = writePsd({ width: 1, height: 1, imageData }),
    restored = mergeMissingPsdResources(rewritten, preserved),
    blocks = extractPsdResources(restored);
  assert.ok(
    blocks.some((candidate) =>
      Buffer.from(candidate).equals(Buffer.from(proprietary)),
    ),
  );
});

void test('new writer resource IDs take precedence over preserved duplicates', () => {
  const imageData = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([1, 2, 3, 255]),
    },
    written = writePsd({
      width: 1,
      height: 1,
      imageData,
      imageResources: { xmpMetadata: '<x:xmpmeta>new</x:xmpmeta>' },
    }),
    duplicateXmp = block(1060, [...new TextEncoder().encode('old')]),
    merged = mergeMissingPsdResources(written, [duplicateXmp]),
    xmpBlocks = extractPsdResources(merged).filter(
      (candidate) =>
        new DataView(candidate.buffer, candidate.byteOffset).getUint16(
          4,
          false,
        ) === 1060,
    );
  assert.equal(xmpBlocks.length, 1);
  assert.notDeepEqual(xmpBlocks[0], duplicateXmp);
});
