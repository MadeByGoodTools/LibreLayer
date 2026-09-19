import assert from 'node:assert/strict';
import test from 'node:test';
import { writePsd } from 'ag-psd';
import {
  extractPsdCompAppearance,
  injectPsdCompAppearance,
} from '../lib/psd-comp-appearance.ts';
import { upsertPsdResource } from '../lib/psd-resources.ts';

void test('full layer-comp appearance recipes round-trip in PSD metadata', () => {
  const imageData = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([1, 2, 3, 255]),
    },
    comps = [
      {
        id: '1',
        name: 'Color story',
        states: [
          {
            id: '19',
            visible: true,
            x: 4,
            y: 8,
            opacity: 42,
            fill: 88,
            blend: 'multiply',
            rotation: 12,
            scaleX: 1.2,
            scaleY: 0.9,
            brightness: 110,
            contrast: 95,
            saturation: 70,
            blur: 3,
          },
        ],
      },
    ],
    encoded = injectPsdCompAppearance(
      writePsd({ width: 1, height: 1, imageData }),
      comps,
    );
  assert.deepEqual(extractPsdCompAppearance(encoded), comps);
});

void test('malformed layer-comp appearance metadata fails closed', () => {
  const encoded = upsertPsdResource(
    writePsd({
      width: 1,
      height: 1,
      imageData: {
        width: 1,
        height: 1,
        data: new Uint8ClampedArray([1, 2, 3, 255]),
      },
    }),
    0xbef0,
    new TextEncoder().encode(
      'LibreLayerCompAppearance/1\n' +
        JSON.stringify([
          {
            id: 'bad',
            name: 'Bad state',
            states: [
              {
                id: '1',
                visible: true,
                x: 0,
                y: 0,
                opacity: 'not a number',
                blend: 'normal',
              },
            ],
          },
        ]),
    ),
  );
  assert.throws(
    () => extractPsdCompAppearance(encoded),
    /Malformed PSD layer-comp appearance metadata/,
  );
});
