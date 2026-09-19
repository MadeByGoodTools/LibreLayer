import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeCanvas, readPsd, writePsd, type Layer } from 'ag-psd';
import { defaultView } from '../lib/editor-view.ts';
import {
  canExportPsdLayerComps,
  editorViewToPsdResources,
  importPsdLayerComps,
  planPsdLayerComps,
  psdDocumentMetadata,
  psdResourcesToEditorView,
  supportedPsdDocumentMetadata,
  supportedPsdDocumentView,
  supportedPsdLayerComps,
  type PortableCompLayer,
  type PortableLayerComp,
} from '../lib/psd-document-structure.ts';

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

const pixels = {
  width: 2,
  height: 2,
  data: new Uint8ClampedArray(16).fill(255),
};
const layers: PortableCompLayer[] = [
  {
    id: 'top',
    visible: true,
    x: 12,
    y: 4,
    opacity: 100,
    fill: 100,
    blend: 'source-over',
  },
  {
    id: 'base',
    visible: true,
    x: 0,
    y: 0,
    opacity: 100,
    fill: 100,
    blend: 'source-over',
  },
];
const comps: PortableLayerComp[] = [
  {
    id: 'solo',
    name: 'Solo top',
    comment: 'Visibility and position',
    states: [
      { ...layers[0], visible: true, x: 30, y: 20 },
      { ...layers[1], visible: false },
    ],
  },
  {
    id: 'all',
    name: 'Show all',
    states: layers.map((layer) => ({ ...layer })),
  },
];

void test('PSD guides, grid spacing, and resolution round-trip natively', () => {
  const resources = editorViewToPsdResources({
      ...defaultView,
      gridSize: 64,
      resolution: 300,
      guides: [
        { id: 'v', axis: 'x', position: 42.5 },
        { id: 'h', axis: 'y', position: 81.25 },
      ],
    }),
    restored = readPsd(
      writePsd({
        width: 2,
        height: 2,
        imageData: pixels,
        imageResources: resources,
      }),
      { useRawData: true },
    ).imageResources;
  assert.deepEqual(psdResourcesToEditorView(restored), {
    gridSize: 64,
    resolution: 300,
    guides: [
      {
        id: 'psd-guide-0-vertical-42.5',
        axis: 'x',
        position: 42.5,
      },
      {
        id: 'psd-guide-1-horizontal-81.25',
        axis: 'y',
        position: 81.25,
      },
    ],
  });
});

void test('visibility and position layer comps round-trip through PSD records', () => {
  const plan = planPsdLayerComps(comps, layers),
    nativeLayers: Layer[] = layers.map((layer, index) => ({
      id: index + 10,
      name: layer.id,
      imageData: pixels,
      comps: plan.byLayerId[layer.id],
    })),
    restored = readPsd(
      writePsd({
        width: 2,
        height: 2,
        imageData: pixels,
        imageResources: { layerComps: plan.resource },
        children: nativeLayers,
      }),
      { useRawData: true },
    );
  assert.equal(
    supportedPsdLayerComps(
      restored.imageResources?.layerComps,
      restored.children ?? [],
    ),
    true,
  );
  const imported = importPsdLayerComps(
    restored.imageResources?.layerComps,
    (restored.children ?? []).map((layer, index) => ({
      sourceId: layer.id,
      layerId: layers[index].id,
      visible: !layer.hidden,
      comps: layer.comps,
    })),
  );
  assert.equal(imported[0].name, 'Solo top');
  assert.equal(imported[0].comment, 'Visibility and position');
  assert.deepEqual(imported[0].states, [
    { id: 'top', visible: true, x: 18, y: 16 },
    { id: 'base', visible: false, x: 0, y: 0 },
  ]);
  assert.deepEqual(imported[1].states, [
    { id: 'top', visible: true, x: 0, y: 0 },
    { id: 'base', visible: true, x: 0, y: 0 },
  ]);
});

void test('appearance-changing and malformed comps fail closed', () => {
  const altered = structuredClone(comps);
  altered[0].states[0].opacity = 40;
  assert.equal(canExportPsdLayerComps(altered, layers), false);
  assert.throws(() => planPsdLayerComps(altered, layers), /visibility and position/);
  assert.equal(
    supportedPsdLayerComps(
      {
        list: [{ id: 1, name: 'Appearance', capturedInfo: 7 as never }],
      },
      [],
    ),
    false,
  );
  const duplicateState = structuredClone(comps);
  duplicateState[0].states[1].id = duplicateState[0].states[0].id;
  assert.equal(canExportPsdLayerComps(duplicateState, layers), false);
  assert.equal(
    supportedPsdLayerComps(
      { list: [{ id: 0, name: 'Invalid ID', capturedInfo: 3 as never }] },
      [],
    ),
    false,
  );
});

void test('unsupported document-view metadata fails closed without silent loss', () => {
  assert.equal(
    supportedPsdDocumentView({
      gridAndGuidesInformation: {
        guides: Array.from({ length: 101 }, (_, index) => ({
          location: index,
          direction: 'vertical',
        })),
      },
    }),
    false,
  );
  assert.equal(
    supportedPsdDocumentView({
      gridAndGuidesInformation: {
        grid: { horizontal: 3200, vertical: 6400 },
      },
    }),
    false,
  );
  assert.equal(
    supportedPsdDocumentView({
      resolutionInfo: {
        horizontalResolution: 300,
        horizontalResolutionUnit: 'PPI',
        widthUnit: 'Inches',
        verticalResolution: 300 / 2.54,
        verticalResolutionUnit: 'PPCM',
        heightUnit: 'Inches',
      },
    }),
    true,
  );
  assert.equal(
    psdResourcesToEditorView({
      resolutionInfo: {
        horizontalResolution: 300 / 2.54,
        horizontalResolutionUnit: 'PPCM',
        widthUnit: 'Inches',
        verticalResolution: 300 / 2.54,
        verticalResolutionUnit: 'PPCM',
        heightUnit: 'Inches',
      },
    }).resolution,
    300,
  );
});

void test('supported PSD document metadata round-trips without mutation', () => {
  const metadata = {
      xmpMetadata:
        '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF /></x:xmpmeta>',
      pixelAspectRatio: { aspect: 1.25 },
      globalAngle: 120,
      globalAltitude: 35,
      printScale: { style: 'user defined' as const, x: 2, y: 3, scale: 87.5 },
      iccUntaggedProfile: false,
    },
    restored = readPsd(
      writePsd({
        width: 2,
        height: 2,
        imageData: pixels,
        imageResources: metadata,
      }),
      { useRawData: true },
    ).imageResources;
  assert.equal(supportedPsdDocumentMetadata(restored), true);
  assert.deepEqual(psdDocumentMetadata(restored), metadata);
});

void test('unsafe PSD document metadata fails closed', () => {
  assert.equal(
    supportedPsdDocumentMetadata({ pixelAspectRatio: { aspect: 0 } }),
    false,
  );
  assert.equal(
    supportedPsdDocumentMetadata({
      printScale: { style: 'user defined', scale: Number.NaN },
    }),
    false,
  );
  assert.throws(
    () => psdDocumentMetadata({ globalAltitude: 120 }),
    /malformed PSD document metadata/,
  );
});
