import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeCanvas, readPsd, writePsd } from 'ag-psd';
import {
  portableShapeToPsd,
  psdShapeToPortable,
  supportedPsdShapeLayer,
  type PortableShapeLayer,
} from '../lib/psd-shape.ts';

initializeCanvas(
  () => {
    throw Error('Canvas allocation was not expected');
  },
  (width, height) =>
    ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }) as ImageData,
);

const pixels = {
  width: 100,
  height: 80,
  data: new Uint8ClampedArray(100 * 80 * 4),
};
const shape: PortableShapeLayer = {
  fill: '#36c58f',
  fillEnabled: true,
  paths: [
    {
      closed: true,
      operation: 'combine',
      fillRule: 'non-zero',
      anchors: [
        { x: 10, y: 12 },
        { x: 90, y: 12 },
        { x: 90, y: 68 },
        { x: 10, y: 68 },
      ],
    },
  ],
  stroke: {
    enabled: true,
    color: '#102030',
    width: 4,
    opacity: 75,
    cap: 'round',
    join: 'bevel',
    dashes: [8, 3],
  },
};

void test('native PSD shape paths, fill and stroke round-trip editably', () => {
  const records = portableShapeToPsd(shape);
  assert.ok(records);
  const restored = readPsd(
    writePsd({
      width: 100,
      height: 80,
      imageData: pixels,
      children: [{ name: 'Native shape', imageData: pixels, ...records }],
    }),
    { useRawData: true },
  ).children?.[0];
  assert.ok(restored);
  assert.equal(supportedPsdShapeLayer(restored), true);
  assert.deepEqual(psdShapeToPortable(restored), shape);
});

void test('unsupported vector records fail closed', () => {
  const records = portableShapeToPsd(shape)!;
  assert.equal(
    supportedPsdShapeLayer({
      ...records,
      vectorMask: { ...records.vectorMask!, invert: true },
    }),
    false,
  );
  assert.equal(
    supportedPsdShapeLayer({
      ...records,
      vectorStroke: {
        ...records.vectorStroke!,
        content: { type: 'pattern', name: 'Pattern', id: 'pattern' },
      },
    }),
    false,
  );
});

void test('curved stroke-only shape preserves handles and disabled fill', () => {
  const curved: PortableShapeLayer = {
    fill: '#ffffff',
    fillEnabled: false,
    paths: [
      {
        closed: true,
        operation: 'intersect',
        fillRule: 'even-odd',
        anchors: [
          {
            x: 50,
            y: 8,
            incoming: { x: 28, y: 8 },
            outgoing: { x: 72, y: 8 },
            smooth: true,
          },
          {
            x: 92,
            y: 40,
            incoming: { x: 92, y: 18 },
            outgoing: { x: 92, y: 62 },
            smooth: true,
          },
          {
            x: 50,
            y: 72,
            incoming: { x: 72, y: 72 },
            outgoing: { x: 28, y: 72 },
            smooth: true,
          },
          {
            x: 8,
            y: 40,
            incoming: { x: 8, y: 62 },
            outgoing: { x: 8, y: 18 },
            smooth: true,
          },
        ],
      },
    ],
    stroke: {
      enabled: true,
      color: '#ff3366',
      width: 6,
      opacity: 50,
      cap: 'square',
      join: 'round',
      dashes: [],
    },
  };
  const records = portableShapeToPsd(curved);
  assert.ok(records);
  const restored = readPsd(
    writePsd({
      width: 100,
      height: 80,
      imageData: pixels,
      children: [{ name: 'Curved outline', imageData: pixels, ...records }],
    }),
    { useRawData: true },
  ).children?.[0];
  assert.ok(restored);
  assert.deepEqual(psdShapeToPortable(restored), curved);
});
