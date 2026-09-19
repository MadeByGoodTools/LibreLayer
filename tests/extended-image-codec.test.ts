import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decodeRadianceHdr,
  encodeRadianceHdr,
  encodeOpenExr,
  encodeJpeg2000,
  encodeExtendedImage,
  extendedImageKind,
} from '../lib/extended-image-codec.ts';

if (!globalThis.ImageData)
  globalThis.ImageData = class ImageData {
    readonly colorSpace = 'srgb' as const;
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(data: Uint8ClampedArray, width: number, height: number) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  } as typeof ImageData;

void test('extended image routing recognizes every promised raster family', () => {
  const kind = (name: string, type = '') => extendedImageKind({ name, type });
  assert.equal(kind('scene.exr'), 'exr');
  assert.equal(kind('light.HDR'), 'hdr');
  assert.equal(kind('photo.jxl'), 'jxl');
  assert.equal(kind('scan.jp2'), 'jpeg2000');
  assert.equal(kind('phone.heic'), 'heic');
  assert.equal(kind('web.avif'), 'avif');
  assert.equal(kind('motion.webp'), 'webp');
  assert.equal(kind('ordinary.png'), undefined);
});

void test('Radiance RGBE decodes into a scene-referred float surface', () => {
  const header = new TextEncoder().encode(
      '#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 1 +X 2\n',
    ),
    pixels = Uint8Array.from([1, 2, 4, 136, 10, 20, 30, 135]),
    buffer = new Uint8Array(header.length + pixels.length);
  buffer.set(header);
  buffer.set(pixels, header.length);
  const decoded = decodeRadianceHdr(buffer.buffer);
  assert.equal(decoded.image.width, 2);
  assert.equal(decoded.image.height, 1);
  assert.ok(decoded.precisionData);
  assert.deepEqual(
    Array.from(decoded.precisionData!.data),
    [1, 2, 4, 1, 5, 10, 15, 1],
  );
  assert.equal(decoded.image.data[3], 255);
  assert.equal(decoded.image.data[7], 255);
});

void test('Radiance decoder rejects unsupported orientation and truncation', () => {
  const source = (dimensions: string, pixels: number[] = []) => {
    const header = new TextEncoder().encode(
        `#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n${dimensions}\n`,
      ),
      output = new Uint8Array(header.length + pixels.length);
    output.set(header);
    output.set(pixels, header.length);
    return output.buffer;
  };
  assert.throws(() => decodeRadianceHdr(source('+Y 1 +X 1')), /orientation/);
  assert.throws(() => decodeRadianceHdr(source('-Y 1 +X 1')), /Truncated/);
});

void test('Radiance HDR export round-trips bounded display pixels', () => {
  const encoded = encodeRadianceHdr(
      new ImageData(new Uint8ClampedArray([255, 128, 32, 255]), 1, 1),
    ),
    decoded = decodeRadianceHdr(encoded).precisionData!.data;
  assert.ok(Math.abs(decoded[0] - 1) < 0.01);
  assert.ok(Math.abs(decoded[1] - 0.5) < 0.01);
  assert.ok(Math.abs(decoded[2] - 0.125) < 0.01);
  assert.equal(decoded[3], 1);
});

void test('OpenEXR export writes a valid 32-bit floating-point RGBA scanline image', async () => {
  const source = new ImageData(
      new Uint8ClampedArray([255, 128, 0, 255, 0, 64, 255, 128]),
      2,
      1,
    ),
    encoded = encodeOpenExr(source),
    { default: parseExr } = await import('parse-exr'),
    decoded = parseExr(encoded, 1015);
  assert.equal(decoded.width, 2);
  assert.equal(decoded.height, 1);
  assert.equal(decoded.format, 1023);
  assert.ok(Math.abs(decoded.data[0] - 1) < 0.001);
  assert.ok(decoded.data[1] > 0.21 && decoded.data[1] < 0.22);
  assert.equal(decoded.data[2], 0);
  assert.ok(Math.abs(decoded.data[7] - 128 / 255) < 0.001);
});

void test('JPEG 2000 export produces a decodable OpenJPEG codestream', async () => {
  const source = new ImageData(
      new Uint8ClampedArray([
        255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
      ]),
      2,
      2,
    ),
    encoded = await encodeJpeg2000(source, 100),
    { JpxImage } = await import('jpeg2000'),
    decoded = new JpxImage();
  decoded.parse(Buffer.from(encoded));
  assert.equal(decoded.width, 2);
  assert.equal(decoded.height, 2);
  assert.equal(decoded.componentsCount, 3);
  assert.deepEqual(Array.from(decoded.tiles[0].items.slice(0, 3)), [255, 0, 0]);
});

void test('HEIC export produces an ISO HEIF container in the browser codec path', async () => {
  const encoded = await encodeExtendedImage(
      new ImageData(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1),
      'heic',
      80,
    ),
    bytes = new Uint8Array(encoded);
  assert.equal(new TextDecoder().decode(bytes.slice(4, 8)), 'ftyp');
  assert.ok(bytes.length > 100);
});
