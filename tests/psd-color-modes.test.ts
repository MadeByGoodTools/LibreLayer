import assert from 'node:assert/strict';
import test from 'node:test';
import { getCompositeImageData, initializeCanvas, readPsd } from 'ag-psd';
import { readSupportedPsdHeader } from '../lib/psd-header.ts';

initializeCanvas(
  (width, height) => ({ width, height }) as HTMLCanvasElement,
  (width, height) =>
    ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }) as ImageData,
);

const word = (value: number) => [(value >>> 8) & 255, value & 255];
const long = (value: number) => [
  (value >>> 24) & 255,
  (value >>> 16) & 255,
  (value >>> 8) & 255,
  value & 255,
];
const section = (bytes: number[]) => [...long(bytes.length), ...bytes];
const psd = (
  width: number,
  height: number,
  channels: number,
  depth: number,
  mode: number,
  colorData: number[],
  composite: number[],
) =>
  Uint8Array.from([
    0x38,
    0x42,
    0x50,
    0x53,
    ...word(1),
    0,
    0,
    0,
    0,
    0,
    0,
    ...word(channels),
    ...long(height),
    ...long(width),
    ...word(depth),
    ...word(mode),
    ...section(colorData),
    ...section([]),
    ...section([]),
    ...composite,
  ]).buffer;

void test('1-bit bitmap PSD expands into editable RGBA pixels', () => {
  const buffer = psd(8, 2, 1, 1, 0, [], [...word(0), 0b10101010, 0b01010101]);
  assert.equal(readSupportedPsdHeader(buffer).colorMode, 'bitmap');
  const pixels = getCompositeImageData(readPsd(buffer, { useRawData: true }));
  assert.ok(pixels);
  assert.equal(pixels.data.length, 8 * 2 * 4);
  assert.equal(pixels.data[0], 0);
  assert.equal(pixels.data[4], 255);
  assert.equal(pixels.data[3], 255);
});

void test('indexed PSD resolves its palette without discarding colors', () => {
  const palette = Array.from<number>({ length: 768 }).fill(0);
  palette[0] = 255;
  palette[256 + 1] = 255;
  palette[512 + 2] = 255;
  palette[3] = palette[256 + 3] = palette[512 + 3] = 255;
  const buffer = psd(2, 2, 1, 8, 2, palette, [
    ...word(1),
    ...word(3),
    ...word(3),
    1,
    0,
    1,
    1,
    2,
    3,
  ]);
  assert.equal(readSupportedPsdHeader(buffer).colorMode, 'indexed');
  const pixels = getCompositeImageData(readPsd(buffer, { useRawData: true }));
  assert.ok(pixels);
  assert.deepEqual(
    Array.from(pixels.data.slice(0, 12)),
    [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255],
  );
});

void test('16-bit grayscale PSD retains adjacent source samples', () => {
  const buffer = psd(
    2,
    1,
    1,
    16,
    1,
    [],
    [...word(0), ...word(10000), ...word(10001)],
  );
  const header = readSupportedPsdHeader(buffer);
  assert.equal(header.colorMode, 'grayscale');
  assert.equal(header.bitDepth, 16);
  const pixels = getCompositeImageData(readPsd(buffer, { useRawData: true }));
  assert.ok(pixels?.data instanceof Uint16Array);
  assert.equal(pixels.data[0], 10000);
  assert.equal(pixels.data[4], 10001);
  assert.equal(pixels.data[0], pixels.data[1]);
  assert.equal(pixels.data[4], pixels.data[6]);
});

void test('8-bit CMYK PSD opens as editable RGB without flattening its mode at the header', () => {
  const buffer = psd(1, 1, 4, 8, 4, [], [...word(0), 255, 0, 0, 255]);
  assert.equal(readSupportedPsdHeader(buffer).colorMode, 'cmyk');
  const pixels = getCompositeImageData(readPsd(buffer, { useRawData: true }));
  assert.ok(pixels);
  assert.deepEqual([...pixels.data], [255, 0, 0, 255]);
});

void test('16-bit CMYK composite decoding supports high-depth source channels', () => {
  const buffer = psd(
    1,
    1,
    4,
    16,
    4,
    [],
    [...word(0), ...word(65535), ...word(0), ...word(0), ...word(65535)],
  );
  const pixels = getCompositeImageData(readPsd(buffer, { useRawData: true }));
  assert.ok(pixels);
  assert.deepEqual([...pixels.data], [255, 0, 0, 255]);
});

void test('Lab PSD converts D50 Lab channels into an editable RGB surface', () => {
  const buffer = psd(1, 1, 3, 8, 9, [], [...word(0), 255, 128, 128]);
  assert.equal(readSupportedPsdHeader(buffer).colorMode, 'lab');
  const pixels = getCompositeImageData(readPsd(buffer, { useRawData: true }));
  assert.ok(pixels);
  assert.ok(pixels.data[0] > 245);
  assert.ok(pixels.data[1] > 245);
  assert.ok(pixels.data[2] > 245);
  assert.equal(pixels.data[3], 255);
});
