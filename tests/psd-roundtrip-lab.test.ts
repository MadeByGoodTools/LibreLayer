import assert from 'node:assert/strict';
import test from 'node:test';
import {
  comparePsdPixels,
  createPsdStructureSignature,
  losslessPsdThresholds,
  pixelMetricsPass,
} from '../lib/psd-roundtrip-lab.ts';

const pixels = (values: number[]) => ({
  width: 1,
  height: 1,
  data: new Uint8ClampedArray(values),
});

void test('PSD pixel metrics enforce explicit visual-difference thresholds', () => {
  const exact = comparePsdPixels(
    pixels([1, 2, 3, 255]),
    pixels([1, 2, 3, 255]),
  );
  assert.equal(pixelMetricsPass(exact, losslessPsdThresholds), true);
  const changed = comparePsdPixels(
    pixels([1, 2, 3, 255]),
    pixels([2, 2, 3, 255]),
  );
  assert.deepEqual(changed, {
    maxChannelDelta: 1,
    meanAbsoluteDelta: 0.25,
    changedPixels: 1,
    totalPixels: 1,
    changedPixelRatio: 1,
  });
  assert.equal(pixelMetricsPass(changed, losslessPsdThresholds), false);
});

void test('PSD structure signatures include groups, masks and blend properties', () => {
  const signature = createPsdStructureSignature({
    width: 4,
    height: 3,
    children: [
      {
        name: 'Group',
        children: [
          {
            name: 'Clipped',
            left: 1,
            top: 1,
            right: 3,
            bottom: 2,
            blendMode: 'multiply',
            opacity: 128,
            clipping: true,
            mask: { left: 0, top: 0, right: 2, bottom: 1, defaultColor: 255 },
          },
        ],
      },
    ],
  });
  assert.equal(signature[0]?.path, 'Group');
  assert.equal(signature[1]?.path, 'Group/Clipped');
  assert.equal(signature[1]?.blendMode, 'multiply');
  assert.deepEqual(signature[1]?.mask?.bounds, [0, 0, 2, 1]);
});

void test('PSD pixel comparison rejects mismatched dimensions', () => {
  assert.throws(
    () =>
      comparePsdPixels(pixels([0, 0, 0, 0]), {
        width: 2,
        height: 1,
        data: new Uint8ClampedArray(8),
      }),
    /different dimensions/,
  );
});
