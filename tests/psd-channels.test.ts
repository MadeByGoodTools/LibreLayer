import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCompositeImageData,
  initializeCanvas,
  readPsd,
  writePsd,
  type Psd,
} from 'ag-psd';

initializeCanvas(
  () => {
    throw Error('Canvas is not used by this test');
  },
  (width, height) =>
    ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }) as ImageData,
);

void test('PSD alpha channels retain native names, identifiers, and pixels', () => {
  const imageData = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255]),
    },
    psd: Psd & { additionalChannelData: unknown } = {
      width: 2,
      height: 1,
      imageData,
      children: [{ name: 'Pixels', imageData }],
      imageResources: {
        alphaChannelNames: ['Skin mask', 'Hair mask'],
        alphaIdentifiers: [41, 42],
      },
      additionalChannelData: [
        { width: 2, height: 1, data: new Uint8Array([12, 240]) },
        { width: 2, height: 1, data: new Uint8Array([99, 170]) },
      ],
    };
  const reopened = readPsd(writePsd(psd), {
    useRawData: true,
    skipThumbnail: true,
  }) as Psd & { additionalChannelData?: { data: Uint8Array }[] };
  getCompositeImageData(reopened);
  assert.deepEqual(reopened.imageResources?.alphaChannelNames, [
    'Skin mask',
    'Hair mask',
  ]);
  assert.deepEqual(reopened.imageResources?.alphaIdentifiers, [41, 42]);
  assert.deepEqual(
    reopened.additionalChannelData?.map((channel) => [...channel.data]),
    [
      [12, 240],
      [99, 170],
    ],
  );
});
