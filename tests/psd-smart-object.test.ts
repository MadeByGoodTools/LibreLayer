import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeCanvas, readPsd, writePsd } from 'ag-psd';
import {
  psdToSmartObject,
  smartObjectToPsd,
  supportedPsdSmartObject,
  type PortableSmartObject,
} from '../lib/psd-smart-object.ts';

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

const sourceData =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+VJ0fWQAAAABJRU5ErkJggg==';
const instanceId = '20953ddb-9391-11ec-b4f1-c15674f50bc4';
const recipe = (): PortableSmartObject => ({
  kind: 'embedded',
  sourceName: 'Embedded artwork.png',
  sourceData,
  filterMask: false,
  instanceId,
  sourceVersion: 3,
  dependencies: [],
  filters: [
    {
      id: 'blur',
      version: 2,
      name: 'Blur',
      amount: 4,
      opacity: 80,
      blend: 'source-over',
      enabled: true,
    },
    {
      id: 'sharpen',
      version: 1,
      name: 'Sharpen',
      amount: 25,
      opacity: 65,
      blend: 'overlay',
      enabled: true,
    },
    {
      id: 'brightness',
      version: 1,
      name: 'Brightness',
      amount: 12,
      opacity: 100,
      blend: 'source-over',
      enabled: false,
    },
  ],
});

void test('embedded Smart Objects and three filter families map to PSD records', () => {
  const native = smartObjectToPsd(recipe(), 40, 30);
  assert.ok(native);
  assert.equal(native.placedLayer.type, 'raster');
  assert.deepEqual(
    native.placedLayer.filter?.list.map((filter) => filter.type),
    ['gaussian blur', 'smart sharpen', 'brightness/contrast'],
  );
  assert.equal((native.linkedFile.data?.length ?? 0) > 0, true);
});

void test('the native Smart Object recipe restores editable filters', () => {
  const expected = recipe(),
    native = smartObjectToPsd(expected, 40, 30)!,
    restored = psdToSmartObject(native.placedLayer, [native.linkedFile]);
  assert.ok(restored);
  assert.equal(restored.kind, 'embedded');
  assert.equal(restored.sourceName, expected.sourceName);
  assert.equal(restored.sourceData, expected.sourceData);
  assert.deepEqual(
    restored.filters.map(({ name, amount, opacity, blend, enabled }) => ({
      name,
      amount,
      opacity,
      blend,
      enabled,
    })),
    expected.filters.map(({ name, amount, opacity, blend, enabled }) => ({
      name,
      amount,
      opacity,
      blend,
      enabled,
    })),
  );
});

void test('ag-psd preserves the embedded data and editable Smart Filters', () => {
  const imageData = {
      width: 40,
      height: 30,
      data: new Uint8ClampedArray(40 * 30 * 4),
    },
    native = smartObjectToPsd(recipe(), 40, 30)!,
    decoded = readPsd(
      writePsd({
        width: 40,
        height: 30,
        imageData,
        linkedFiles: [native.linkedFile],
        children: [
          {
            name: 'Smart Object',
            imageData,
            placedLayer: native.placedLayer,
          },
        ],
      }),
      { useImageData: true },
    ),
    placed = decoded.children?.[0]?.placedLayer;
  assert.equal(supportedPsdSmartObject(placed, decoded.linkedFiles), true);
  assert.deepEqual(
    psdToSmartObject(placed, decoded.linkedFiles)?.filters.map(
      (filter) => filter.name,
    ),
    ['Blur', 'Sharpen', 'Brightness'],
  );
});

void test('linked, masked, malformed, and unsupported Smart Objects fail closed', () => {
  assert.equal(
    smartObjectToPsd({ ...recipe(), kind: 'linked' }, 40, 30),
    undefined,
  );
  assert.equal(
    smartObjectToPsd({ ...recipe(), filterMask: true }, 40, 30),
    undefined,
  );
  assert.equal(
    smartObjectToPsd({ ...recipe(), sourceData: 'not-data' }, 40, 30),
    undefined,
  );
  const native = smartObjectToPsd(recipe(), 40, 30)!;
  assert.equal(
    psdToSmartObject(
      {
        ...native.placedLayer,
        transform: [1, 0, 41, 0, 41, 30, 1, 30],
      },
      [native.linkedFile],
    ),
    undefined,
  );
});
