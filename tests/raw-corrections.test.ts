import assert from 'node:assert/strict';
import test from 'node:test';
import {
  correctRawLens,
  correctRawNoise,
  defaultRawLensCorrection,
  defaultRawNoiseCorrection,
  resolveRawLensProfile,
} from '../lib/raw-corrections.ts';

void test('hot-pixel correction suppresses an isolated sensor spike', () => {
  const pixels = new Float32Array(5 * 5 * 3).fill(0.2),
    center = (2 * 5 + 2) * 3;
  pixels[center] = 1;
  const corrected = correctRawNoise(pixels, 5, 5, {
    ...defaultRawNoiseCorrection(),
    hotPixels: 100,
  });
  assert.ok(corrected[center] < 0.25);
  assert.ok(Math.abs(corrected[0] - 0.2) < 1e-6);
});

void test('banding and chroma noise corrections are independent', () => {
  const pixels = new Float32Array(6 * 4 * 3);
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 6; x++) {
      const at = (y * 6 + x) * 3;
      pixels[at] = 0.3 + y * 0.05 + (x % 2) * 0.03;
      pixels[at + 1] = 0.3 + y * 0.05;
      pixels[at + 2] = 0.3 + y * 0.05 - (x % 2) * 0.03;
    }
  const banded = correctRawNoise(pixels, 6, 4, {
      ...defaultRawNoiseCorrection(),
      banding: 100,
    }),
    chroma = correctRawNoise(pixels, 6, 4, {
      ...defaultRawNoiseCorrection(),
      chroma: 100,
    });
  assert.notDeepEqual(banded, pixels);
  assert.notDeepEqual(chroma, pixels);
  assert.notDeepEqual(chroma, banded);
});

void test('local lens profiles resolve from EXIF lens names', () => {
  assert.equal(resolveRawLensProfile('auto', '16-35mm F2.8')?.id, 'generic-wide');
  assert.equal(resolveRawLensProfile('auto', '70-200mm F2.8')?.id, 'generic-telephoto');
  assert.equal(resolveRawLensProfile('none', '16mm')?.id, undefined);
});

void test('lens corrections alter edges while retaining finite scene values', () => {
  const pixels = new Float32Array(8 * 8 * 3).map(
      (_, index) => ((index * 7) % 37) / 37,
    ),
    corrected = correctRawLens(
      pixels,
      8,
      8,
      {
        ...defaultRawLensCorrection(),
        profileId: 'generic-wide',
        defringe: 60,
        sharpening: 20,
      },
      '',
    );
  assert.notDeepEqual(corrected, pixels);
  assert.ok(corrected.every(Number.isFinite));
});
