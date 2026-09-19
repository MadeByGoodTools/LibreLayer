import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  initializeCanvas,
  readPsd,
  writePsd,
  type PixelData,
  type Psd,
} from 'ag-psd';
import {
  collectPsdPixelData,
  comparePsdPixels,
  createPsdStructureSignature,
  losslessPsdThresholds,
  pixelMetricsPass,
} from '../lib/psd-roundtrip-lab.ts';

initializeCanvas(
  () => {
    throw new Error('Unexpected canvas allocation in the PSD round-trip lab');
  },
  (width, height) =>
    ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
      colorSpace: 'srgb',
    }) as ImageData,
);

function solid(
  width: number,
  height: number,
  rgba: [number, number, number, number],
) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let offset = 0; offset < data.length; offset += 4)
    data.set(rgba, offset);
  return { width, height, data };
}

function fixture(): Psd {
  return {
    width: 8,
    height: 6,
    imageData: solid(8, 6, [22, 34, 56, 255]),
    children: [
      {
        name: 'Treatment',
        opened: true,
        blendMode: 'pass through',
        children: [
          {
            name: 'Warm highlights',
            left: 2,
            top: 1,
            right: 6,
            bottom: 5,
            blendMode: 'screen',
            opacity: 173 / 255,
            imageData: solid(4, 4, [245, 156, 82, 192]),
            mask: {
              left: 2,
              top: 1,
              right: 6,
              bottom: 5,
              defaultColor: 0,
              imageData: solid(4, 4, [255, 255, 255, 255]),
            },
          },
        ],
      },
      {
        name: 'Base',
        left: 0,
        top: 0,
        right: 8,
        bottom: 6,
        imageData: solid(8, 6, [22, 34, 56, 255]),
      },
    ],
  };
}

const fileIndex = process.argv.indexOf('--file');
const file = fileIndex >= 0 ? process.argv[fileIndex + 1] : undefined;
const source = file
  ? readPsd(await readFile(file), { useImageData: true })
  : fixture();
const encoded = writePsd(source, { noBackground: true });
const reopened = readPsd(encoded, { useImageData: true });

assert.deepEqual(
  createPsdStructureSignature(reopened),
  createPsdStructureSignature(source),
  'Layer structure changed during PSD round-trip',
);

const before = collectPsdPixelData(source);
const after = collectPsdPixelData(reopened);
assert.deepEqual(
  [...after.keys()],
  [...before.keys()],
  'Pixel-bearing layers changed',
);
const visual = [...before].map(([path, expected]) => {
  const actual = after.get(path) as PixelData;
  const metrics = comparePsdPixels(expected, actual);
  assert.equal(
    pixelMetricsPass(metrics, losslessPsdThresholds),
    true,
    `${path} changed`,
  );
  return { path, ...metrics };
});

console.log(
  JSON.stringify(
    {
      result: 'pass',
      fixture: file ?? 'generated-layered-rgb',
      provenance: file
        ? 'external-file supplied by operator'
        : 'LibreLayer deterministic fixture',
      thresholds: losslessPsdThresholds,
      layers: createPsdStructureSignature(source).length,
      visual,
    },
    null,
    2,
  ),
);
