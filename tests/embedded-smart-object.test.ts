import assert from 'node:assert/strict';
import test from 'node:test';
import { validateEmbeddedDocument } from '../lib/embedded-smart-object.ts';
import {
  serializeWorkingSurface,
  workingSurfaceFromRgba8,
} from '../lib/working-depth.ts';

const png = 'data:image/png;base64,AAAA';
const valid = () => ({
  version: 1 as const,
  width: 24,
  height: 16,
  selectedId: 'art',
  selectedIds: ['art'],
  layers: [{ id: 'art', name: 'Artwork' }],
  surfaces: [{ id: 'art', pixels: png }],
});

void test('layered embedded documents retain their editable envelope', () => {
  const data = {
    ...valid(),
    artboards: [{ id: 'board', name: 'Hero', x: 0, y: 0, w: 24, h: 16 }],
  };
  assert.equal(validateEmbeddedDocument(data), data);
});

void test('embedded documents bound their artboard collection', () => {
  assert.throws(
    () =>
      validateEmbeddedDocument({
        ...valid(),
        artboards: Array.from({ length: 257 }, (_, id) => ({ id })),
      }),
    /Invalid embedded Smart Object artboards/,
  );
});

void test('embedded documents reject missing pixels and foreign selections', () => {
  assert.throws(
    () => validateEmbeddedDocument({ ...valid(), surfaces: [] }),
    /Invalid embedded Smart Object document/,
  );
  assert.throws(
    () => validateEmbeddedDocument({ ...valid(), selectedId: 'missing' }),
    /Invalid embedded Smart Object selection/,
  );
});

void test('embedded documents reject recursive and excessive nesting', () => {
  const recursive: any = valid();
  recursive.layers[0].smartObject = { embeddedDocument: recursive };
  assert.throws(
    () => validateEmbeddedDocument(recursive),
    /Invalid embedded Smart Object document/,
  );

  let nested: any = valid();
  for (let depth = 0; depth < 22; depth++) {
    const parent: any = valid();
    parent.layers[0].smartObject = { embeddedDocument: nested };
    nested = parent;
  }
  assert.throws(
    () => validateEmbeddedDocument(nested),
    /Invalid embedded Smart Object document/,
  );
});

void test('embedded documents validate and retain matching high-depth pixels', () => {
  const workingPixels = serializeWorkingSurface(
    workingSurfaceFromRgba8(new Uint8ClampedArray(24 * 16 * 4), 24, 16, '16f'),
  );
  const data = {
    ...valid(),
    workingDepth: '16f' as const,
    surfaces: [{ id: 'art', pixels: png, workingPixels }],
  };
  assert.equal(validateEmbeddedDocument(data), data);
});

void test('scene-referred encoding survives high-depth embedding and is rejected for 8-bit content', () => {
  const workingPixels = serializeWorkingSurface(
    workingSurfaceFromRgba8(new Uint8ClampedArray(24 * 16 * 4), 24, 16, '32f'),
  );
  const data = {
    ...valid(),
    workingDepth: '32f' as const,
    sceneReferred: true,
    surfaces: [{ id: 'art', pixels: png, workingPixels }],
  };
  assert.equal(validateEmbeddedDocument(data), data);
  assert.throws(
    () => validateEmbeddedDocument({ ...valid(), sceneReferred: true }),
    /Scene-referred embedded content requires high-depth pixels/,
  );
});

void test('embedded documents reject missing, mismatched, or unexpected high-depth pixels', () => {
  const workingPixels = serializeWorkingSurface(
    workingSurfaceFromRgba8(new Uint8ClampedArray(24 * 16 * 4), 24, 16, '32f'),
  );
  assert.throws(
    () => validateEmbeddedDocument({ ...valid(), workingDepth: '16u' }),
    /Invalid stored high-depth surface/,
  );
  assert.throws(
    () =>
      validateEmbeddedDocument({
        ...valid(),
        workingDepth: '16u',
        surfaces: [{ id: 'art', pixels: png, workingPixels }],
      }),
    /Invalid embedded high-depth pixels/,
  );
  assert.throws(
    () =>
      validateEmbeddedDocument({
        ...valid(),
        surfaces: [{ id: 'art', pixels: png, workingPixels }],
      }),
    /Unexpected high-depth embedded pixels/,
  );
});
