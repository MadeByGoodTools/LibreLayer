import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeCanvas, readPsd, writePsd } from 'ag-psd';
import {
  portableTextToPsd,
  psdTextToPortable,
  unsupportedPsdTextReasons,
  type PortableTextLayer,
} from '../lib/psd-text.ts';

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

const editable: PortableTextLayer = {
  content: 'Native type\nround-trip',
  color: '#c86432',
  originX: 24,
  originY: 48,
  paragraph: true,
  width: 320,
  family: 'ArialMT',
  weight: 700,
  style: 'italic',
  stretch: 1.1,
  size: 32,
  tracking: 1.6,
  kerning: true,
  leading: 1.4,
  baseline: 2,
  align: 'center',
  onPath: false,
  pathMode: 'none',
  warp: 12,
  warpStyle: 'arc',
  fit: 'none',
  boxHeight: 90,
  smallCaps: true,
  ligatures: true,
  direction: 'ltr',
  language: 'en',
  underline: true,
  strike: false,
  indent: 8,
  spaceBefore: 4,
  spaceAfter: 6,
};

void test('editable LibreLayer text maps to native PSD type and back', () => {
  const restored = psdTextToPortable(portableTextToPsd(editable));
  assert.equal(restored.content, editable.content);
  assert.equal(restored.color, editable.color);
  assert.equal(restored.originX, editable.originX);
  assert.equal(restored.originY, editable.originY);
  assert.equal(restored.family, editable.family);
  assert.equal(restored.size, editable.size);
  assert.equal(restored.weight, editable.weight);
  assert.equal(restored.align, editable.align);
  assert.equal(restored.warpStyle, editable.warpStyle);
});

void test('ag-psd serializes LibreLayer text as an editable text record', () => {
  const encoded = writePsd({
    width: 400,
    height: 200,
    imageData: {
      width: 400,
      height: 200,
      data: new Uint8ClampedArray(400 * 200 * 4),
    },
    children: [{ name: 'Headline', text: portableTextToPsd(editable) }],
  });
  const decoded = readPsd(encoded, { useImageData: true });
  const text = decoded.children?.[0]?.text;
  assert.ok(text);
  assert.equal(text.text, editable.content);
  assert.equal(text.style?.font?.name, editable.family);
  assert.equal(text.shapeType, 'box');
});

void test('unsupported PSD typography is explicit', () => {
  assert.deepEqual(
    unsupportedPsdTextReasons({
      text: 'Vertical',
      orientation: 'vertical',
      styleRuns: [
        { length: 1, style: { fontSize: 12 } },
        { length: 7, style: { fontSize: 24 } },
      ],
    }),
    ['vertical text', 'mixed character styles'],
  );
});
