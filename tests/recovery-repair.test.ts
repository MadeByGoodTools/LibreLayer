import assert from 'node:assert/strict';
import test from 'node:test';
import { packRecoveryJson } from '../lib/recovery-codec.ts';
import {
  newestReadableRecovery,
  type StoredRecoveryRecord,
} from '../lib/recovery.ts';

void test('repair selection skips a damaged newest copy for an intact version', async () => {
  const json = JSON.stringify({
      format: 'librelayer',
      layers: [{ pixels: 'data:image/png;base64,AAAA' }],
    }),
    packed = await packRecoveryJson(json),
    intact: StoredRecoveryRecord = {
      id: 'older',
      name: 'Portrait',
      updated: 10,
      manifest: packed.manifest,
      encoding: 'plain',
      assetIds: packed.assets.map((asset) => asset.id),
    },
    damaged: StoredRecoveryRecord = {
      ...intact,
      id: 'newer',
      updated: 20,
      assetIds: ['missing'],
    };
  const intactAssets = new Map(packed.assets.map((asset) => [asset.id, asset]));
  const restored = await newestReadableRecovery(
    [
      intact,
      {
        ...damaged,
        manifest: `{"pixels":"librelayer-asset:${'0'.repeat(64)}"}`,
      },
    ],
    intactAssets,
  );
  assert.equal(restored?.id, 'older');
  assert.equal(restored?.json, json);
});

void test('repair selection reports no source when every candidate is damaged', async () => {
  const restored = await newestReadableRecovery(
    [
      {
        id: 'broken',
        name: 'Broken',
        updated: 1,
        manifest: `{"pixels":"librelayer-asset:${'0'.repeat(64)}"}`,
        encoding: 'plain',
        assetIds: ['missing'],
      },
    ],
    new Map(),
  );
  assert.equal(restored, null);
});
