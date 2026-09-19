import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeCanvas, readPsd, writePsd } from 'ag-psd';
import { createIccProfile } from '../lib/image-export.ts';
import {
  extractPsdIccProfile,
  injectPsdIccProfile,
  validPsdIccProfile,
} from '../lib/psd-icc.ts';

initializeCanvas(
  () => ({ width: 1, height: 1 }) as HTMLCanvasElement,
  (width, height) =>
    ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }) as ImageData,
);

const pixels = {
  width: 1,
  height: 1,
  data: new Uint8ClampedArray([40, 90, 160, 255]),
};

void test('embedded ICC bytes survive exact PSD replacement and extraction', () => {
  const source = writePsd({
      width: 1,
      height: 1,
      imageData: pixels,
      imageResources: { xmpMetadata: '<xmp>keep me</xmp>' },
      children: [{ name: 'Pixel', imageData: pixels }],
    }),
    profile = createIccProfile('display-p3'),
    embedded = injectPsdIccProfile(source, profile);
  assert.deepEqual(extractPsdIccProfile(embedded), profile);
  const replacement = createIccProfile('adobe-rgb'),
    replaced = injectPsdIccProfile(embedded, replacement);
  assert.deepEqual(extractPsdIccProfile(replaced), replacement);
  assert.equal(
    readPsd(replaced, {
      skipLayerImageData: true,
      skipCompositeImageData: true,
    }).imageResources?.xmpMetadata,
    '<xmp>keep me</xmp>',
  );
});

void test('missing and malformed ICC resources fail safely', () => {
  const source = writePsd({ width: 1, height: 1, imageData: pixels });
  assert.equal(extractPsdIccProfile(source), undefined);
  assert.equal(validPsdIccProfile(undefined), true);
  assert.equal(validPsdIccProfile(new Uint8Array(128)), false);
  assert.throws(
    () => injectPsdIccProfile(source, new Uint8Array(128)),
    /Invalid PSD ICC profile/,
  );
});
