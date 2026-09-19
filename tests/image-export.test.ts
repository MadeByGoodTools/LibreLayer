import assert from 'node:assert/strict';
import test from 'node:test';
import UTIF from 'utif';
import {
  convertRgbaColorSpace,
  createIccProfile,
  encodeLayeredTiff,
  encodeRawTiff16,
  encodeTiff,
  type ExportColorSpace,
} from '../lib/image-export.ts';

void test('layered TIFF preserves named pages and independent pixels', () => {
  const buffer = encodeLayeredTiff(
      [
        {
          name: 'Highlights',
          image: {
            width: 1,
            height: 1,
            data: new Uint8ClampedArray([250, 180, 80, 200]),
          } as ImageData,
        },
        {
          name: 'Base',
          image: {
            width: 1,
            height: 1,
            data: new Uint8ClampedArray([20, 40, 70, 255]),
          } as ImageData,
        },
      ],
      { resolution: 300 },
    ),
    ifds = UTIF.decode(buffer);
  assert.equal(ifds.length, 2);
  assert.deepEqual(
    ifds.map((ifd) => (ifd.t285 as string[] | undefined)?.[0]),
    ['Highlights', 'Base'],
  );
  UTIF.decodeImage(buffer, ifds[0]);
  UTIF.decodeImage(buffer, ifds[1]);
  assert.deepEqual(Array.from(UTIF.toRGBA8(ifds[0])), [250, 180, 80, 200]);
  assert.deepEqual(Array.from(UTIF.toRGBA8(ifds[1])), [20, 40, 70, 255]);
});

function tiffEntries(buffer: ArrayBuffer) {
  const view = new DataView(buffer),
    count = view.getUint16(8, true);
  const entries = new Map<
    number,
    { type: number; count: number; value: number }
  >();
  for (let index = 0; index < count; index++) {
    const offset = 10 + index * 12;
    entries.set(view.getUint16(offset, true), {
      type: view.getUint16(offset + 2, true),
      count: view.getUint32(offset + 4, true),
      value: view.getUint32(offset + 8, true),
    });
  }
  return entries;
}

void test('all export profiles are complete ICC v2 RGB profiles', () => {
  const spaces: ExportColorSpace[] = [
    'srgb',
    'display-p3',
    'adobe-rgb',
    'prophoto-rgb',
  ];
  for (const space of spaces) {
    const profile = createIccProfile(space),
      view = new DataView(
        profile.buffer,
        profile.byteOffset,
        profile.byteLength,
      );
    assert.equal(view.getUint32(0, false), profile.length);
    assert.equal(new TextDecoder().decode(profile.slice(16, 20)), 'RGB ');
    assert.equal(new TextDecoder().decode(profile.slice(36, 40)), 'acsp');
    assert.equal(view.getUint32(128, false), 9);
  }
});

void test('TIFF embeds its profile, resolution and unassociated alpha tags', () => {
  const image = {
    width: 2,
    height: 1,
    data: new Uint8ClampedArray([255, 0, 0, 128, 0, 255, 0, 255]),
  } as ImageData;
  const buffer = encodeTiff(image, {
      colorSpace: 'display-p3',
      resolution: 600,
    }),
    view = new DataView(buffer),
    entries = tiffEntries(buffer);
  assert.equal(view.getUint16(0, true), 0x4949);
  assert.equal(view.getUint16(2, true), 42);
  assert.equal((entries.get(277)?.value ?? 0) & 0xffff, 4);
  assert.equal((entries.get(338)?.value ?? 0) & 0xffff, 2);
  assert.equal(entries.get(34675)?.type, 7);
  assert.ok((entries.get(34675)?.count ?? 0) > 300);
  const resolutionOffset = entries.get(282)?.value ?? 0;
  assert.equal(view.getUint32(resolutionOffset, true), 600);
  assert.equal(view.getUint32(resolutionOffset + 4, true), 1);
  const profileOffset = entries.get(34675)?.value ?? 0;
  assert.equal(
    new TextDecoder().decode(new Uint8Array(buffer, profileOffset + 36, 4)),
    'acsp',
  );
});

void test('color conversion preserves alpha and does not mutate source pixels', () => {
  const source = new Uint8ClampedArray([210, 90, 35, 117]),
    converted = convertRgbaColorSpace(source, 'adobe-rgb');
  assert.deepEqual(source, new Uint8ClampedArray([210, 90, 35, 117]));
  assert.equal(converted[3], 117);
  assert.notDeepEqual(converted.slice(0, 3), source.slice(0, 3));
  assert.deepEqual(convertRgbaColorSpace(source, 'srgb'), source);
});

void test('TIFF rejects invalid print resolution metadata', () => {
  const image = {
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([0, 0, 0, 255]),
  } as ImageData;
  assert.throws(() => encodeTiff(image, { resolution: 0 }), /36 to 2400/);
});

void test('RAW master TIFF contains real 16-bit RGB samples and an ICC profile', async () => {
  const blob = encodeRawTiff16(
    {
      image: {
        width: 2,
        height: 1,
        data: new Float32Array([0.01234, 0.23456, 0.78901, 0.5, 0.4, 0.3]),
        bitDepth: 14,
        camera: 'Test Camera',
        lens: 'Test Lens',
      },
      settings: {
        exposure: 0,
        contrast: 0,
        highlights: 0,
        shadows: 0,
        whites: 0,
        blacks: 0,
        temperature: 0,
        tint: 0,
        vibrance: 0,
        saturation: 0,
        highlightRecovery: 35,
      },
    },
    { colorSpace: 'prophoto-rgb', resolution: 300 },
  );
  const buffer = await blob.arrayBuffer(),
    entries = tiffEntries(buffer),
    view = new DataView(buffer);
  assert.equal(entries.get(258)?.count, 3);
  const bitsOffset = entries.get(258)?.value ?? 0;
  assert.deepEqual(
    [0, 1, 2].map((index) => view.getUint16(bitsOffset + index * 2, true)),
    [16, 16, 16],
  );
  assert.equal((entries.get(277)?.value ?? 0) & 0xffff, 3);
  assert.equal(entries.has(338), false);
  assert.ok((entries.get(34675)?.count ?? 0) > 300);
  const pixelOffset = entries.get(273)?.value ?? 0;
  const firstSample = view.getUint16(pixelOffset, true);
  assert.notEqual(firstSample % 257, 0);
  const pages = UTIF.decode(buffer);
  UTIF.decodeImage(buffer, pages[0]);
  assert.equal(UTIF.toRGBA8(pages[0]).length, 8);
});
