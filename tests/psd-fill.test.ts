import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeCanvas, readPsd, writePsd } from 'ag-psd';
import {
  fillRecipeToPsd,
  fillRecipeToPsdGradient,
  fillRecipeToPsdSolid,
  psdFillToRecipe,
  psdGradientFillToRecipe,
  psdSolidFillToRecipe,
} from '../lib/psd-fill.ts';
import { defaultFillLayerRecipe } from '../lib/fill-layer.ts';

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

void test('solid fill recipes map to native PSD fill records', () => {
  const source = {
    ...defaultFillLayerRecipe(),
    mode: 'solid' as const,
    color: '#1a80ef',
  };
  const native = fillRecipeToPsdSolid(source);
  assert.deepEqual(native, { type: 'color', color: { r: 26, g: 128, b: 239 } });
  assert.equal(native && psdSolidFillToRecipe(native).color, source.color);
});

void test('gradient and pattern recipes are never silently labeled as native solid fills', () => {
  assert.equal(
    fillRecipeToPsdSolid({ ...defaultFillLayerRecipe(), mode: 'gradient' }),
    undefined,
  );
  assert.equal(
    fillRecipeToPsdSolid({ ...defaultFillLayerRecipe(), mode: 'pattern' }),
    undefined,
  );
});

void test('two-color gradients preserve their native PSD recipe', () => {
  const source = {
    ...defaultFillLayerRecipe(),
    mode: 'gradient' as const,
    color: '#102030',
    color2: '#d0e0f0',
    angle: 127,
    scale: 135,
    offsetX: -12,
    offsetY: 18,
  };
  const native = fillRecipeToPsdGradient(source);
  assert.ok(native);
  const restored = psdGradientFillToRecipe(native);
  assert.equal(restored.color, source.color);
  assert.equal(restored.color2, source.color2);
  assert.equal(restored.angle, source.angle);
  assert.equal(restored.scale, source.scale);
  assert.equal(restored.offsetX, source.offsetX);
  assert.equal(restored.offsetY, source.offsetY);
  assert.deepEqual(psdFillToRecipe(native), restored);
  assert.deepEqual(fillRecipeToPsd(source), native);
});

void test('ag-psd preserves the editable native solid fill record', () => {
  const imageData = {
    width: 2,
    height: 2,
    data: new Uint8ClampedArray(16).fill(255),
  };
  const vectorFill = fillRecipeToPsdSolid({
    ...defaultFillLayerRecipe(),
    color: '#335577',
  });
  const decoded = readPsd(
    writePsd({
      width: 2,
      height: 2,
      imageData,
      children: [{ name: 'Solid fill', imageData, vectorFill }],
    }),
    { useImageData: true },
  );
  assert.deepEqual(decoded.children?.[0]?.vectorFill, vectorFill);
});

void test('ag-psd preserves the editable native gradient fill record', () => {
  const imageData = {
    width: 2,
    height: 2,
    data: new Uint8ClampedArray(16).fill(255),
  };
  const vectorFill = fillRecipeToPsdGradient({
    ...defaultFillLayerRecipe(),
    mode: 'gradient',
    color: '#001122',
    color2: '#ddeeff',
  });
  const decoded = readPsd(
    writePsd({
      width: 2,
      height: 2,
      imageData,
      children: [{ name: 'Gradient fill', imageData, vectorFill }],
    }),
    { useImageData: true },
  );
  assert.deepEqual(decoded.children?.[0]?.vectorFill, {
    ...vectorFill,
    smoothness: 1,
  });
});
