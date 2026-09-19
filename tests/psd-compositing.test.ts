import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeCanvas, readPsd, writePsd, type Layer } from 'ag-psd';
import {
  blendIfToPsd,
  portableKnockoutToPsd,
  portableFillOpacityToPsd,
  psdBlendIfToPortable,
  psdFillOpacityToPortable,
  psdKnockoutToPortable,
  supportedPsdBlendIf,
} from '../lib/psd-compositing.ts';

void test('PSD knockout preserves none, shallow, and deep values', () => {
  assert.equal(psdKnockoutToPortable(undefined), 'none');
  assert.equal(psdKnockoutToPortable(1), 'shallow');
  assert.equal(psdKnockoutToPortable(2), 'deep');
  assert.equal(portableKnockoutToPsd('none'), undefined);
  assert.equal(portableKnockoutToPsd('shallow'), 1);
  assert.equal(portableKnockoutToPsd('deep'), 2);
  const restored = readPsd(
    writePsd({
      width: 2,
      height: 2,
      imageData: pixels,
      children: [
        { name: 'Shallow', imageData: pixels, knockout: 1 },
        { name: 'Deep', imageData: pixels, knockout: 2 },
      ],
    }),
    { useRawData: true },
  );
  assert.equal(restored.children?.[0].knockout, 1);
  assert.equal(restored.children?.[1].knockout, 2);
});
import { layerEffectsToPsd } from '../lib/psd-effects.ts';
import { defaultLayerEffects } from '../lib/layer-effects.ts';
import {
  smartObjectToPsd,
  type PortableSmartObject,
} from '../lib/psd-smart-object.ts';

initializeCanvas(
  (width, height) => ({ width, height }) as HTMLCanvasElement,
  (width, height) =>
    ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }) as ImageData,
);

const pixels = {
  width: 2,
  height: 2,
  data: new Uint8ClampedArray(16).fill(255),
};

void test('gray Blend If converts to native PSD blending ranges', () => {
  const portable = {
    channel: 'gray' as const,
    source: [12, 28, 220, 244] as [number, number, number, number],
    backdrop: [5, 16, 230, 250] as [number, number, number, number],
  };
  const native = blendIfToPsd(portable);
  assert.deepEqual(native?.compositeGrayBlendSource, portable.source);
  assert.deepEqual(
    native?.compositeGraphBlendDestinationRange,
    portable.backdrop,
  );
  assert.deepEqual(psdBlendIfToPortable(native), portable);
});

void test('one RGB channel remains editable', () => {
  const portable = {
    channel: 'green' as const,
    source: [22, 40, 210, 232] as [number, number, number, number],
    backdrop: [3, 18, 225, 248] as [number, number, number, number],
  };
  const native = blendIfToPsd(portable)!;
  assert.deepEqual(native.ranges[1].sourceRange, portable.source);
  assert.deepEqual(psdBlendIfToPortable(native), portable);
});

void test('gray and RGB Blend If channels round-trip together', () => {
  const portable = {
    channel: 'gray' as const,
    source: [12, 28, 220, 244] as [number, number, number, number],
    backdrop: [5, 16, 230, 250] as [number, number, number, number],
    channels: {
      gray: {
        source: [12, 28, 220, 244] as [number, number, number, number],
        backdrop: [5, 16, 230, 250] as [number, number, number, number],
      },
      red: {
        source: [1, 2, 253, 254] as [number, number, number, number],
        backdrop: [3, 4, 251, 252] as [number, number, number, number],
      },
      blue: {
        source: [8, 24, 216, 248] as [number, number, number, number],
        backdrop: [4, 12, 236, 252] as [number, number, number, number],
      },
    },
  };
  const native = blendIfToPsd(portable)!;
  assert.equal(supportedPsdBlendIf(native), true);
  assert.deepEqual(psdBlendIfToPortable(native), portable);
});

void test('fill opacity validates and converts between percent and PSD fraction', () => {
  assert.equal(portableFillOpacityToPsd(42), 0.42);
  assert.equal(psdFillOpacityToPortable(0.42), 42);
  assert.equal(portableFillOpacityToPsd(100), undefined);
  assert.equal(psdFillOpacityToPortable(1), undefined);
  assert.equal(portableFillOpacityToPsd(101), undefined);
  assert.equal(psdFillOpacityToPortable(-0.1), undefined);
});

void test('PSD codec preserves clipping, fill opacity and Blend If bytes', () => {
  const layer: Layer = {
    name: 'Clipped grade',
    imageData: pixels,
    clipping: true,
    fillOpacity: portableFillOpacityToPsd(63),
    blendingRanges: blendIfToPsd({
      channel: 'blue',
      source: [8, 24, 216, 248],
      backdrop: [4, 12, 236, 252],
    }),
  };
  const buffer = writePsd({
    width: 2,
    height: 2,
    imageData: pixels,
    children: [layer],
  });
  const restored = readPsd(buffer, { useRawData: true }).children?.[0];
  assert.equal(restored?.clipping, true);
  assert.equal(psdFillOpacityToPortable(restored?.fillOpacity), 63);
  assert.deepEqual(psdBlendIfToPortable(restored?.blendingRanges), {
    channel: 'blue',
    source: [8, 24, 216, 248],
    backdrop: [4, 12, 236, 252],
  });
});

void test('PSD codec preserves isolated group opacity, fill and raster mask', () => {
  const maskPixels = {
    width: 2,
    height: 2,
    data: new Uint8ClampedArray([
      0, 0, 0, 255, 85, 85, 85, 255, 170, 170, 170, 255, 255, 255, 255, 255,
    ]),
  };
  const buffer = writePsd({
    width: 2,
    height: 2,
    imageData: pixels,
    children: [
      {
        name: 'Isolated group',
        blendMode: 'normal',
        opacity: 0.72,
        fillOpacity: 0.54,
        mask: {
          left: 0,
          top: 0,
          right: 2,
          bottom: 2,
          defaultColor: 0,
          imageData: maskPixels,
        },
        children: [{ name: 'Child', imageData: pixels }],
      },
    ],
  });
  const restored = readPsd(buffer, { useRawData: true }).children?.[0];
  assert.equal(restored?.blendMode, 'normal');
  assert.ok(Math.abs((restored?.opacity ?? 0) - 0.72) < 1 / 255);
  assert.equal(psdFillOpacityToPortable(restored?.fillOpacity), 54);
  assert.equal(restored?.mask?.defaultColor, 0);
  assert.deepEqual(
    restored?.children?.map((child) => child.name),
    ['Child'],
  );
});

void test('PSD codec exports a styled clipped Smart Object with Blend If', () => {
  const smartObject: PortableSmartObject = {
      kind: 'embedded',
      sourceName: 'Embedded artwork.png',
      sourceData:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+VJ0fWQAAAABJRU5ErkJggg==',
      filterMask: false,
      instanceId: '20953ddb-9391-11ec-b4f1-c15674f50bc4',
      filters: [
        {
          id: 'blur',
          name: 'Blur',
          amount: 4,
          opacity: 80,
          blend: 'source-over',
          enabled: true,
        },
        {
          id: 'sharpen',
          name: 'Sharpen',
          amount: 25,
          opacity: 65,
          blend: 'overlay',
          enabled: true,
        },
        {
          id: 'brightness',
          name: 'Brightness',
          amount: 12,
          opacity: 100,
          blend: 'source-over',
          enabled: true,
        },
      ],
    },
    nativeSmartObject = smartObjectToPsd(smartObject, 2, 2);
  assert.ok(nativeSmartObject);
  const buffer = writePsd({
    width: 2,
    height: 2,
    imageData: pixels,
    linkedFiles: [nativeSmartObject.linkedFile],
    children: [
      {
        name: 'Styled Smart Object',
        imageData: pixels,
        clipping: true,
        fillOpacity: portableFillOpacityToPsd(63),
        blendingRanges: blendIfToPsd({
          channel: 'gray',
          source: [18, 40, 255, 255],
          backdrop: [0, 0, 255, 255],
        }),
        effects: layerEffectsToPsd({
          ...defaultLayerEffects(),
          outerGlow: true,
        }),
        placedLayer: nativeSmartObject.placedLayer,
      },
    ],
  });
  const restored = readPsd(buffer, { useRawData: true });
  assert.equal(restored.children?.[0]?.clipping, true);
  assert.ok(restored.children?.[0]?.effects?.outerGlow);
  assert.equal(restored.children?.[0]?.placedLayer?.filter?.list.length, 3);
});
