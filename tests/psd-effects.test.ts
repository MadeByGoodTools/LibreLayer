import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeCanvas, readPsd, writePsd } from 'ag-psd';
import {
  layerEffectsToPsd,
  psdEffectsToLayerEffects,
  supportedPsdEffects,
} from '../lib/psd-effects.ts';
import { defaultLayerEffects } from '../lib/layer-effects.ts';

initializeCanvas(
  () => {
    throw new Error('Canvas allocation was not expected');
  },
  (width, height) =>
    ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }) as ImageData,
);

const completeRecipe = () => ({
  ...defaultLayerEffects(),
  dropShadow: true,
  innerShadow: true,
  outerGlow: true,
  innerGlow: true,
  bevel: true,
  satin: true,
  colorOverlay: true,
  gradientOverlay: true,
  patternOverlay: false,
  stroke: true,
  color: '#18324a',
  secondaryColor: '#f0c070',
  opacity: 64,
  size: 18,
  distance: 9,
  angle: 122,
  useGlobalLight: false,
  scale: 130,
  contour: 'linear' as const,
});

void test('nine LibreLayer effect families map to native PSD records', () => {
  const native = layerEffectsToPsd(completeRecipe());
  assert.ok(native);
  assert.equal(native.dropShadow?.length, 1);
  assert.equal(native.innerShadow?.length, 1);
  assert.equal(native.outerGlow?.enabled, true);
  assert.equal(native.innerGlow?.enabled, true);
  assert.equal(native.bevel?.enabled, true);
  assert.equal(native.satin?.enabled, true);
  assert.equal(native.solidFill?.length, 1);
  assert.equal(native.gradientOverlay?.length, 1);
  assert.equal(native.stroke?.length, 1);
});

void test('native effect records restore the shared editable recipe exactly', () => {
  const expected = completeRecipe(),
    restored = psdEffectsToLayerEffects(layerEffectsToPsd(expected));
  assert.deepEqual(restored, expected);
});

void test('ag-psd preserves the editable native effect records', () => {
  const imageData = { width: 2, height: 2, data: new Uint8ClampedArray(16) },
    expected = completeRecipe(),
    decoded = readPsd(
      writePsd({
        width: 2,
        height: 2,
        imageData,
        children: [
          {
            name: 'Styled layer',
            imageData,
            effects: layerEffectsToPsd(expected),
          },
        ],
      }),
      { useImageData: true },
    ),
    native = decoded.children?.[0]?.effects;
  assert.equal(supportedPsdEffects(native), true);
  assert.deepEqual(psdEffectsToLayerEffects(native), expected);
});

void test('ag-psd serializes a sparse single-effect recipe without undefined records', () => {
  const imageData = { width: 2, height: 2, data: new Uint8ClampedArray(16) },
    expected = {
      ...defaultLayerEffects(),
      dropShadow: false,
      outerGlow: true,
      color: '#3264c8',
      opacity: 72,
      size: 14,
      contour: 'smooth' as const,
    },
    native = layerEffectsToPsd(expected);
  assert.ok(native);
  assert.equal(
    Object.values(native).some((value) => value === undefined),
    false,
  );
  const restored = readPsd(
    writePsd({
      width: 2,
      height: 2,
      imageData,
      children: [{ name: 'Glow', imageData, effects: native }],
    }),
    { useImageData: true },
  ).children?.[0]?.effects;
  assert.equal(supportedPsdEffects(restored), true);
  assert.deepEqual(psdEffectsToLayerEffects(restored), expected);
});

void test('unsupported or lossy effect records fail closed', () => {
  assert.equal(
    layerEffectsToPsd({ ...completeRecipe(), patternOverlay: true }),
    undefined,
  );
  const native = layerEffectsToPsd(completeRecipe())!;
  assert.equal(
    psdEffectsToLayerEffects({
      ...native,
      dropShadow: [native.dropShadow![0], native.dropShadow![0]],
    }),
    undefined,
  );
  assert.equal(
    psdEffectsToLayerEffects({
      ...native,
      innerShadow: [{ ...native.innerShadow![0], opacity: 0.2 }],
    }),
    undefined,
  );
});
