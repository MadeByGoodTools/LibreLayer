import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compressRecoveryManifest,
  decompressRecoveryManifest,
  hydrateRecoveryJson,
  packRecoveryJson,
  referencedRecoveryAssets,
} from '../lib/recovery-codec.ts';

const redPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';

void test('recovery pixels deduplicate into content-addressed assets', async () => {
  const source = JSON.stringify({ layers: [{ pixels: redPixel }, { pixels: redPixel }] });
  const packed = await packRecoveryJson(source);
  assert.equal(packed.assets.length, 1);
  assert.equal(referencedRecoveryAssets(packed.manifest).length, 2);
  assert.deepEqual(
    JSON.parse(await hydrateRecoveryJson(packed.manifest, new Map(packed.assets.map((x) => [x.id, x])))),
    JSON.parse(source),
  );
});

void test('large recovery manifests compress and restore exactly', async () => {
  const source = JSON.stringify({ value: 'repeated '.repeat(12000) });
  const packed = await compressRecoveryManifest(source);
  assert.equal(await decompressRecoveryManifest(packed.data, packed.encoding), source);
});

void test('missing recovery assets fail explicitly', async () => {
  const packed = await packRecoveryJson(JSON.stringify({ pixels: redPixel }));
  await assert.rejects(hydrateRecoveryJson(packed.manifest, new Map()), /asset is missing/);
});
