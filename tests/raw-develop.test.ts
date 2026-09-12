import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultRawDevelopSettings,
  developRawRgba,
  developRawRgb16,
  isRawDevelopSettings,
  normalizeRawDecodeSettings,
  rawDecodeOptions,
  type RawLinearImage,
} from '../lib/raw-develop.ts';

const image: RawLinearImage = {
  width: 2,
  height: 2,
  data: new Float32Array([
    0.02, 0.02, 0.02, 0.18, 0.16, 0.12, 0.72, 0.62, 0.48, 1.3, 1.1, 0.9,
  ]),
  bitDepth: 14,
  camera: 'Test Camera',
  lens: 'Test Lens',
};

void test('RAW development preserves dimensions and emits opaque display pixels', () => {
  const result = developRawRgba(image, defaultRawDevelopSettings);
  assert.equal(result.width, 2);
  assert.equal(result.height, 2);
  assert.equal(result.data.length, 16);
  assert.deepEqual(
    [result.data[3], result.data[7], result.data[11], result.data[15]],
    [255, 255, 255, 255],
  );
});

void test('RAW preview scales down without changing its aspect ratio', () => {
  const wide: RawLinearImage = {
    ...image,
    width: 4,
    height: 2,
    data: new Float32Array(4 * 2 * 3).fill(0.18),
  };
  const result = developRawRgba(wide, defaultRawDevelopSettings, 2);
  assert.equal(result.width, 2);
  assert.equal(result.height, 1);
});

void test('exposure and highlight recovery materially affect the developed result', () => {
  const neutral = developRawRgba(image, {
    ...defaultRawDevelopSettings,
    highlightRecovery: 0,
  });
  const brighter = developRawRgba(image, {
    ...defaultRawDevelopSettings,
    exposure: 1,
    highlightRecovery: 0,
  });
  const recovered = developRawRgba(image, {
    ...defaultRawDevelopSettings,
    exposure: 1,
    highlightRecovery: 100,
  });
  assert.ok(brighter.data[0] > neutral.data[0]);
  assert.ok(recovered.data[12] <= brighter.data[12]);
});

void test('16-bit RAW development preserves precision beyond 8-bit expansion', () => {
  const result = developRawRgb16(
    image,
    defaultRawDevelopSettings,
    'prophoto-rgb',
  );
  const samples = new Uint16Array(result.data.buffer);
  assert.equal(samples.length, image.width * image.height * 3);
  assert.ok(samples.some((sample) => sample % 257 !== 0));
});

void test('RAW demosaic modes map to distinct LibRaw interpolation recipes', () => {
  assert.equal(rawDecodeOptions({ demosaic: 'linear' }).userQual, 0);
  assert.equal(rawDecodeOptions({ demosaic: 'ahd' }).userQual, 3);
  assert.equal(rawDecodeOptions({ demosaic: 'dcb' }).userQual, 4);
  assert.equal(rawDecodeOptions({ demosaic: 'dcb' }).dcbIterations, 2);
  assert.equal(rawDecodeOptions({ demosaic: 'dht' }).userQual, 11);
  assert.equal(rawDecodeOptions({ demosaic: 'modified-ahd' }).userQual, 12);
});

void test('RAW white balance and embedded profiles produce explicit decode options', () => {
  assert.equal(rawDecodeOptions({ whiteBalance: 'camera' }).useCameraWb, true);
  assert.equal(rawDecodeOptions({ whiteBalance: 'auto' }).useAutoWb, true);
  assert.deepEqual(rawDecodeOptions({ whiteBalance: 'daylight' }).userMul, [
    2.15, 1, 1.45, 1,
  ]);
  assert.equal(
    rawDecodeOptions({ cameraProfile: 'embedded-dng' }).cameraProfile,
    'embed',
  );
  assert.deepEqual(normalizeRawDecodeSettings({ demosaic: 'invalid' as never }), {
    demosaic: 'dht',
    whiteBalance: 'camera',
    cameraProfile: 'camera-matrix',
  });
});

void test('saved Camera Raw recipes require every bounded adjustment', () => {
  assert.equal(isRawDevelopSettings(defaultRawDevelopSettings), true);
  assert.equal(
    isRawDevelopSettings({
      ...defaultRawDevelopSettings,
      decode: {
        cameraProfile: 'embedded-dng',
        whiteBalance: 'daylight',
        demosaic: 'dcb',
      },
      noise: {
        hotPixels: 25,
        chroma: 30,
        banding: 10,
        luminance: 20,
      },
    }),
    true,
  );
  assert.equal(
    isRawDevelopSettings({ ...defaultRawDevelopSettings, exposure: 8 }),
    false,
  );
  assert.equal(
    isRawDevelopSettings({
      ...defaultRawDevelopSettings,
      decode: {
        ...defaultRawDevelopSettings.decode,
        demosaic: 'unknown',
      },
    }),
    false,
  );
  assert.equal(
    isRawDevelopSettings({
      ...defaultRawDevelopSettings,
      lensCorrection: {
        ...defaultRawDevelopSettings.lensCorrection,
        profileId: 'missing-profile',
      },
    }),
    false,
  );
  assert.equal(
    isRawDevelopSettings({
      ...defaultRawDevelopSettings,
      noise: { luminance: 101 },
    }),
    false,
  );
  assert.equal(isRawDevelopSettings({ exposure: 0, contrast: 0 }), false);
});
