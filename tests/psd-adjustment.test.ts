import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeCanvas, readPsd, writePsd } from 'ag-psd';
import {
  highDepthToPsdAdjustment,
  highDepthToPsdBrightness,
  psdAdjustmentToHighDepth,
  psdBrightnessToHighDepth,
  supportedPsdAdjustment,
} from '../lib/psd-adjustment.ts';
import { createDefaultHighDepthAdjustments } from '../lib/high-depth.ts';

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

void test('brightness and contrast map to a native PSD adjustment', () => {
  const native = highDepthToPsdBrightness({
    ...createDefaultHighDepthAdjustments(),
    brightness: 18,
    contrast: -9,
  });
  assert.deepEqual(native, {
    type: 'brightness/contrast',
    brightness: 18,
    contrast: -9,
    useLegacy: false,
  });
  const restored = psdBrightnessToHighDepth(native!);
  assert.equal(restored.brightness, 18);
  assert.equal(restored.contrast, -9);
});

void test('supported professional adjustment families stay native and editable', () => {
  const base = createDefaultHighDepthAdjustments();
  const cases = [
    {
      expected: 'exposure',
      value: { ...base, exposure: 1.25, exposureGamma: 0.9 },
    },
    { expected: 'vibrance', value: { ...base, vibrance: 28, saturation: 7 } },
    {
      expected: 'hue/saturation',
      value: { ...base, hue: 15, saturation: -12 },
    },
    {
      expected: 'color balance',
      value: { ...base, balanceCyanRed: 8, balanceMagentaGreen: -4 },
    },
    {
      expected: 'black & white',
      value: { ...base, blackWhite: true, redMix: 42 },
    },
    {
      expected: 'photo filter',
      value: { ...base, photoFilter: '#ff8800', photoFilterDensity: 25 },
    },
    {
      expected: 'levels',
      value: { ...base, levelsBlack: 12, levelsWhite: 242, levelsGamma: 1.2 },
    },
    {
      expected: 'curves',
      value: {
        ...base,
        curves: {
          rgb: [
            { x: 0, y: 0.1 },
            { x: 1, y: 0.9 },
          ],
        },
      },
    },
    {
      expected: 'channel mixer',
      value: {
        ...base,
        channelMixer: {
          ...base.channelMixer!,
          red: { red: 90, green: 10, blue: 0, constant: 0 },
        },
      },
    },
    {
      expected: 'gradient map',
      value: {
        ...base,
        gradientMap: { shadows: '#102030', highlights: '#e0f0ff', amount: 100 },
      },
    },
    {
      expected: 'selective color',
      value: {
        ...base,
        selectiveColor: {
          mode: 'absolute' as const,
          colors: { reds: { cyan: -12, magenta: 8, yellow: 4, black: 0 } },
        },
      },
    },
  ];
  for (const item of cases) {
    const native = highDepthToPsdAdjustment(item.value);
    assert.equal(native?.type, item.expected);
    assert.ok(native && psdAdjustmentToHighDepth(native), item.expected);
  }
});

void test('the PSD codec accepts every mapped adjustment family', () => {
  const base = createDefaultHighDepthAdjustments();
  const recipes = [
    { ...base, exposure: 0.75 },
    { ...base, vibrance: 20 },
    { ...base, hue: 10 },
    { ...base, balanceYellowBlue: 12 },
    { ...base, blackWhite: true },
    { ...base, photoFilterDensity: 20 },
    { ...base, levelsBlack: 8 },
    {
      ...base,
      curves: {
        rgb: [
          { x: 0, y: 0 },
          { x: 1, y: 0.8 },
        ],
      },
    },
    {
      ...base,
      channelMixer: {
        ...base.channelMixer!,
        blue: { red: 5, green: 0, blue: 95, constant: 0 },
      },
    },
    {
      ...base,
      gradientMap: { shadows: '#000000', highlights: '#ffffff', amount: 100 },
    },
    {
      ...base,
      selectiveColor: {
        mode: 'relative' as const,
        colors: { blues: { cyan: 10, magenta: 0, yellow: -5, black: 0 } },
      },
    },
  ];
  const children = recipes.map((recipe, index) => ({
    name: `Adjustment ${index + 1}`,
    adjustment: highDepthToPsdAdjustment(recipe),
  }));
  const imageData = { width: 2, height: 2, data: new Uint8ClampedArray(16) };
  const decoded = readPsd(
    writePsd({ width: 2, height: 2, imageData, children }),
    {
      useImageData: true,
    },
  );
  assert.deepEqual(
    decoded.children?.map((layer) => layer.adjustment?.type),
    children.map((layer) => layer.adjustment?.type),
  );
});

void test('combined LibreLayer recipes cannot masquerade as one native adjustment', () => {
  assert.equal(
    highDepthToPsdBrightness({
      ...createDefaultHighDepthAdjustments(),
      brightness: 10,
      exposure: 1,
    }),
    undefined,
  );
});

void test('richer Photoshop records are rejected instead of losing unsupported settings', () => {
  const hueRange = {
    a: 0,
    b: 0,
    c: 0,
    d: 0,
    hue: 12,
    saturation: 0,
    lightness: 0,
  };
  const unsupported = [
    { type: 'brightness/contrast' as const, brightness: 10, useLegacy: true },
    { type: 'exposure' as const, exposure: 1, offset: 0.1 },
    { type: 'hue/saturation' as const, reds: hueRange },
    {
      type: 'color balance' as const,
      shadows: { cyanRed: 2, magentaGreen: 0, yellowBlue: 0 },
    },
    { type: 'black & white' as const, reds: 30, yellows: 10 },
    {
      type: 'photo filter' as const,
      density: 25,
      preserveLuminosity: false,
    },
    {
      type: 'channel mixer' as const,
      monochrome: true,
      gray: { red: 40, green: 40, blue: 20, constant: 0 },
    },
    {
      type: 'gradient map' as const,
      gradientType: 'solid' as const,
      dither: true,
      colorStops: [
        { color: { r: 0, g: 0, b: 0 }, location: 0, midpoint: 50 },
        { color: { r: 255, g: 255, b: 255 }, location: 4096, midpoint: 50 },
      ],
    },
  ];
  for (const adjustment of unsupported) {
    assert.equal(psdAdjustmentToHighDepth(adjustment), undefined);
    assert.equal(supportedPsdAdjustment(adjustment), false);
  }
});

void test('the PSD codec preserves the editable brightness adjustment record', () => {
  const imageData = { width: 2, height: 2, data: new Uint8ClampedArray(16) };
  const adjustment = highDepthToPsdBrightness({
    ...createDefaultHighDepthAdjustments(),
    brightness: 12,
    contrast: 7,
  });
  const decoded = readPsd(
    writePsd({
      width: 2,
      height: 2,
      imageData,
      children: [{ name: 'Brightness', adjustment }],
    }),
    { useImageData: true },
  );
  const restored = decoded.children?.[0]?.adjustment;
  assert.equal(supportedPsdAdjustment(restored), true);
  assert.equal(restored?.type, 'brightness/contrast');
  assert.equal(
    restored?.type === 'brightness/contrast' ? restored.brightness : undefined,
    12,
  );
});
