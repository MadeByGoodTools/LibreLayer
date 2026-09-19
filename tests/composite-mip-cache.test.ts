import assert from 'node:assert/strict';
import test from 'node:test';
import {
  displayCompositeKey,
  mipChainDimensions,
  mipLevelForZoom,
} from '../lib/composite-mip-cache.ts';

void test('mip chains halve large documents and stop at the preview edge', () => {
  assert.deepEqual(mipChainDimensions(8000, 6000, 500, 8), [
    { level: 1, width: 4000, height: 3000 },
    { level: 2, width: 2000, height: 1500 },
    { level: 3, width: 1000, height: 750 },
    { level: 4, width: 500, height: 375 },
  ]);
});

void test('zoom selects the closest safe lower-resolution composite', () => {
  assert.equal(mipLevelForZoom(100, 5), 0);
  assert.equal(mipLevelForZoom(68, 5), 0);
  assert.equal(mipLevelForZoom(50, 5), 1);
  assert.equal(mipLevelForZoom(24, 5), 2);
  assert.equal(mipLevelForZoom(3, 3), 3);
});

void test('composite keys change for content-affecting document state', () => {
  const base = {
      documentId: 'doc-a',
      width: 1200,
      height: 800,
      precision: 'u8',
      quality: 'final',
      sceneReferred: false,
      profileId: 'srgb',
      hdrPreviewMode: 'auto',
      layerSignature: '[visible]',
    },
    key = displayCompositeKey(base);
  assert.equal(displayCompositeKey({ ...base }), key);
  assert.notEqual(displayCompositeKey({ ...base, quality: 'preview' }), key);
  assert.notEqual(
    displayCompositeKey({ ...base, layerSignature: '[hidden]' }),
    key,
  );
  assert.notEqual(displayCompositeKey({ ...base, documentId: 'doc-b' }), key);
});
