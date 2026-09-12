import test from 'node:test';
import assert from 'node:assert/strict';
import {
  abrAlphaToRgba,
  filterBrushTips,
  maskAlphaFromRgba,
  normalizeBrushTags,
} from '../lib/brush-library.ts';

const tips = [
  { id: '1', name: 'Dry Charcoal', folder: 'Sketch', tags: ['dry'], favorite: true },
  { id: '2', name: 'Soft Round', folder: 'Basics', tags: ['soft'], favorite: false },
];

void test('brush tags normalize, deduplicate, and stay bounded', () => {
  assert.deepEqual(normalizeBrushTags(' Dry, ink, dry '), ['dry', 'ink']);
  assert.equal(normalizeBrushTags(Array.from({ length: 20 }, (_, i) => `t${i}`)).length, 12);
});

void test('brush search covers names, folders, tags, and favorites', () => {
  assert.deepEqual(filterBrushTips(tips, 'char', 'all', false).map((x) => x.id), ['1']);
  assert.deepEqual(filterBrushTips(tips, '', 'Basics', false).map((x) => x.id), ['2']);
  assert.deepEqual(filterBrushTips(tips, '', 'all', true).map((x) => x.id), ['1']);
});

void test('custom image tips turn dark opaque pixels into paint alpha', () => {
  assert.deepEqual(
    [...maskAlphaFromRgba(new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]))],
    [255, 0],
  );
});

void test('ABR inverse alpha samples become white paint masks', () => {
  assert.deepEqual([...abrAlphaToRgba(new Uint8Array([0, 127, 255]))], [
    255, 255, 255, 255,
    255, 255, 255, 128,
    255, 255, 255, 0,
  ]);
});
