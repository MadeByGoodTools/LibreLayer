import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultRawDevelopSettings,
  type RawDevelopSettings,
} from '../lib/raw-develop.ts';
import {
  createRawRecipeSidecar,
  parseRawRecipeSidecar,
  serializeRawRecipeSidecar,
} from '../lib/raw-sidecar.ts';

void test('RAW recipes round-trip every persisted development setting', () => {
  const settings: RawDevelopSettings = {
      ...defaultRawDevelopSettings,
      exposure: 1.25,
      decode: { demosaic: 'dcb', whiteBalance: 'auto', cameraProfile: 'embedded-dng' },
    },
    sidecar = createRawRecipeSidecar(settings, {
      camera: 'Test Camera',
      lens: 'Test Lens',
    }),
    parsed = parseRawRecipeSidecar(serializeRawRecipeSidecar(sidecar));
  assert.deepEqual(parsed, sidecar);
  assert.notEqual(parsed.settings, settings);
});

void test('RAW recipes reject unknown formats and unsafe settings', () => {
  assert.throws(() => parseRawRecipeSidecar('{"format":"x","version":1}'));
  assert.throws(() =>
    parseRawRecipeSidecar(
      JSON.stringify({
        format: 'librelayer-raw-recipe',
        version: 1,
        settings: { ...defaultRawDevelopSettings, exposure: 10 },
      }),
    ),
  );
});
