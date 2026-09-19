export type ExportFormat =
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'animated-webp'
  | 'avif'
  | 'jxl'
  | 'heic'
  | 'jpeg2000'
  | 'exr'
  | 'hdr'
  | 'eps'
  | 'tiff'
  | 'pdf';
export type ExportColorSpace =
  | 'srgb'
  | 'display-p3'
  | 'adobe-rgb'
  | 'prophoto-rgb';

import { checkDimensions } from './document-limits.ts';
import {
  developRawRgb16,
  type RawDevelopSettings,
  type RawLinearImage,
} from './raw-develop.ts';

type TiffOptions = { colorSpace?: ExportColorSpace; resolution?: number };
type TiffEntry = { tag: number; type: number; count: number; data: Uint8Array };
export type HighPrecisionRawSource = {
  image: RawLinearImage;
  settings: RawDevelopSettings;
};
export type LayeredTiffPage = { name: string; image: ImageData };

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const ascii = (value: string) => new TextEncoder().encode(value);
const nullTerminated = (value: string) =>
  ascii(value.endsWith('\0') ? value : `${value}\0`);
const pad4 = (data: Uint8Array) => {
  const padding = (4 - (data.length % 4)) % 4;
  if (!padding) return data;
  const result = new Uint8Array(data.length + padding);
  result.set(data);
  return result;
};
const concat = (...parts: Uint8Array[]) => {
  const result = new Uint8Array(
    parts.reduce((sum, part) => sum + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
};
const u16 = (values: number[]) => {
  const data = new Uint8Array(values.length * 2);
  const view = new DataView(data.buffer);
  values.forEach((value, index) => view.setUint16(index * 2, value, true));
  return data;
};
const u32 = (values: number[]) => {
  const data = new Uint8Array(values.length * 4);
  const view = new DataView(data.buffer);
  values.forEach((value, index) => view.setUint32(index * 4, value, true));
  return data;
};
const rational = (numerator: number, denominator = 1) =>
  concat(u32([numerator]), u32([denominator]));

const multiply3 = (matrix: number[], vector: number[]) => [
  matrix[0] * vector[0] + matrix[1] * vector[1] + matrix[2] * vector[2],
  matrix[3] * vector[0] + matrix[4] * vector[1] + matrix[5] * vector[2],
  matrix[6] * vector[0] + matrix[7] * vector[1] + matrix[8] * vector[2],
];
const xyzToRgb: Record<Exclude<ExportColorSpace, 'srgb'>, number[]> = {
  'display-p3': [
    2.4935, -0.9314, -0.4027, -0.8295, 1.7627, 0.0236, 0.0358, -0.0762, 0.9569,
  ],
  'adobe-rgb': [
    2.0416, -0.565, -0.3447, -0.9692, 1.876, 0.0416, 0.0134, -0.1184, 1.0154,
  ],
  'prophoto-rgb': [
    1.3459, -0.2556, -0.0511, -0.5446, 1.5082, 0.0205, 0, 0, 1.2123,
  ],
};
const decodeSrgb = (value: number) =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
const encodeSrgb = (value: number) => {
  const safe = clamp01(value);
  return safe <= 0.0031308 ? safe * 12.92 : 1.055 * safe ** (1 / 2.4) - 0.055;
};
const encodeTarget = (
  value: number,
  target: Exclude<ExportColorSpace, 'srgb'>,
) => {
  const safe = clamp01(value);
  if (target === 'display-p3') return encodeSrgb(safe);
  if (target === 'adobe-rgb') return safe ** (1 / 2.19921875);
  return safe < 1 / 512 ? safe * 16 : safe ** (1 / 1.8);
};

/** Convert sRGB canvas pixels into a tagged TIFF's destination RGB space. */
export function convertRgbaColorSpace(
  source: Uint8ClampedArray,
  target: ExportColorSpace,
) {
  const output = new Uint8ClampedArray(source);
  if (target === 'srgb') return output;
  const srgbToXyzD65 = [
    0.4124564, 0.3575761, 0.1804375, 0.2126729, 0.7151522, 0.072175, 0.0193339,
    0.119192, 0.9503041,
  ];
  const d65ToD50 = [
    1.0478112, 0.0228866, -0.050127, 0.0295424, 0.9904844, -0.0170491,
    -0.0092345, 0.0150436, 0.7521316,
  ];
  for (let offset = 0; offset < output.length; offset += 4) {
    const linear = [
      decodeSrgb(source[offset] / 255),
      decodeSrgb(source[offset + 1] / 255),
      decodeSrgb(source[offset + 2] / 255),
    ];
    let xyz = multiply3(srgbToXyzD65, linear);
    if (target === 'prophoto-rgb') xyz = multiply3(d65ToD50, xyz);
    const converted = multiply3(xyzToRgb[target], xyz);
    output[offset] = Math.round(encodeTarget(converted[0], target) * 255);
    output[offset + 1] = Math.round(encodeTarget(converted[1], target) * 255);
    output[offset + 2] = Math.round(encodeTarget(converted[2], target) * 255);
  }
  return output;
}

const be32 = (value: number) => {
  const data = new Uint8Array(4);
  new DataView(data.buffer).setUint32(0, value, false);
  return data;
};
const s15Fixed16 = (value: number) => {
  const data = new Uint8Array(4);
  new DataView(data.buffer).setInt32(0, Math.round(value * 65536), false);
  return data;
};
const iccDescription = (value: string) => {
  const text = nullTerminated(value);
  return pad4(
    concat(ascii('desc'), new Uint8Array(4), be32(text.length), text),
  );
};
const iccText = (value: string) =>
  pad4(concat(ascii('text'), new Uint8Array(4), nullTerminated(value)));
const iccXyz = (values: number[]) =>
  concat(ascii('XYZ '), new Uint8Array(4), ...values.map(s15Fixed16));
const iccCurve = (profileGamma: number) => {
  const data = new Uint8Array(14);
  data.set(ascii('curv'));
  const view = new DataView(data.buffer);
  view.setUint32(8, 1, false);
  view.setUint16(12, Math.round(profileGamma * 256), false);
  return pad4(data);
};
const iccParametricCurve = (parameters: number[]) => {
  const data = new Uint8Array(12 + parameters.length * 4);
  data.set(ascii('para'));
  const view = new DataView(data.buffer);
  view.setUint16(8, 4, false);
  parameters.forEach((value, index) =>
    data.set(s15Fixed16(value), 12 + index * 4),
  );
  return pad4(data);
};

/** A compact matrix ICC v2 profile embedded directly in exported TIFF files. */
export function createIccProfile(space: ExportColorSpace) {
  const names: Record<ExportColorSpace, string> = {
    srgb: 'LibreLayer sRGB',
    'display-p3': 'LibreLayer Display P3',
    'adobe-rgb': 'LibreLayer Adobe RGB (1998)',
    'prophoto-rgb': 'LibreLayer ProPhoto RGB',
  };
  const primaries: Record<ExportColorSpace, number[][]> = {
    srgb: [
      [0.4361, 0.2225, 0.0139],
      [0.3851, 0.7169, 0.0971],
      [0.1431, 0.0606, 0.7141],
    ],
    'display-p3': [
      [0.5151, 0.2412, -0.0011],
      [0.292, 0.6922, 0.0419],
      [0.1571, 0.0666, 0.7841],
    ],
    'adobe-rgb': [
      [0.6098, 0.3111, 0.0195],
      [0.2052, 0.6257, 0.0609],
      [0.1492, 0.0632, 0.7446],
    ],
    'prophoto-rgb': [
      [0.7977, 0.288, 0],
      [0.1352, 0.7119, 0],
      [0.0313, 0.0001, 0.8249],
    ],
  };
  const srgbCurve = iccParametricCurve([
    2.4,
    1 / 1.055,
    0.055 / 1.055,
    1 / 12.92,
    0.04045,
    0,
    0,
  ]);
  const proPhotoCurve = iccParametricCurve([1.8, 1, 0, 1 / 16, 0.03125, 0, 0]);
  const curve =
    space === 'srgb' || space === 'display-p3'
      ? srgbCurve
      : space === 'adobe-rgb'
        ? iccCurve(2.19921875)
        : proPhotoCurve;
  const tags = [
    ['desc', iccDescription(names[space])],
    [
      'cprt',
      iccText(
        'Generated by LibreLayer. Standard RGB primaries and transfer curves.',
      ),
    ],
    ['wtpt', iccXyz([0.9642, 1, 0.8249])],
    ['rXYZ', iccXyz(primaries[space][0])],
    ['gXYZ', iccXyz(primaries[space][1])],
    ['bXYZ', iccXyz(primaries[space][2])],
    ['rTRC', curve],
    ['gTRC', curve],
    ['bTRC', curve],
  ] as const;
  const header = new Uint8Array(128);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(8, 0x02100000, false);
  header.set(ascii('mntr'), 12);
  header.set(ascii('RGB '), 16);
  header.set(ascii('XYZ '), 20);
  header.set(ascii('acsp'), 36);
  header.set(ascii('APPL'), 40);
  header.set(s15Fixed16(0.9642), 68);
  header.set(s15Fixed16(1), 72);
  header.set(s15Fixed16(0.8249), 76);
  header.set(ascii('LLYR'), 80);
  const table = new Uint8Array(4 + tags.length * 12);
  const tableView = new DataView(table.buffer);
  tableView.setUint32(0, tags.length, false);
  let dataOffset = header.length + table.length;
  const payload: Uint8Array[] = [];
  tags.forEach(([signature, data], index) => {
    const entry = 4 + index * 12;
    table.set(ascii(signature), entry);
    tableView.setUint32(entry + 4, dataOffset, false);
    tableView.setUint32(entry + 8, data.length, false);
    payload.push(data);
    dataOffset += data.length;
  });
  const profile = concat(header, table, ...payload);
  new DataView(profile.buffer).setUint32(0, profile.length, false);
  return profile;
}

function validateResolution(resolution: number) {
  if (!Number.isInteger(resolution) || resolution < 36 || resolution > 2400)
    throw Error('Choose a resolution from 36 to 2400 pixels per inch.');
}

function encodeTiffParts(
  width: number,
  height: number,
  pixels: Uint8Array,
  bits: 8 | 16,
  samples: 3 | 4,
  profile: Uint8Array,
  resolution: number,
) {
  const software = nullTerminated('LibreLayer 0.5');
  const entries: TiffEntry[] = [
    { tag: 256, type: 4, count: 1, data: u32([width]) },
    { tag: 257, type: 4, count: 1, data: u32([height]) },
    { tag: 258, type: 3, count: samples, data: u16(Array(samples).fill(bits)) },
    { tag: 259, type: 3, count: 1, data: u16([1]) },
    { tag: 262, type: 3, count: 1, data: u16([2]) },
    { tag: 273, type: 4, count: 1, data: u32([0]) },
    { tag: 274, type: 3, count: 1, data: u16([1]) },
    { tag: 277, type: 3, count: 1, data: u16([samples]) },
    { tag: 278, type: 4, count: 1, data: u32([height]) },
    { tag: 279, type: 4, count: 1, data: u32([pixels.length]) },
    { tag: 282, type: 5, count: 1, data: rational(resolution) },
    { tag: 283, type: 5, count: 1, data: rational(resolution) },
    { tag: 284, type: 3, count: 1, data: u16([1]) },
    { tag: 296, type: 3, count: 1, data: u16([2]) },
    { tag: 305, type: 2, count: software.length, data: software },
    ...(samples === 4 ? [{ tag: 338, type: 3, count: 1, data: u16([2]) }] : []),
    {
      tag: 339,
      type: 3,
      count: samples,
      data: u16(Array(samples).fill(1)),
    },
    { tag: 34675, type: 7, count: profile.length, data: profile },
  ];
  entries.sort((a, b) => a.tag - b.tag);
  const ifdOffset = 8;
  const ifdSize = 2 + entries.length * 12 + 4;
  let externalOffset = ifdOffset + ifdSize;
  const external: Uint8Array[] = [];
  const ifd = new Uint8Array(ifdSize);
  const ifdView = new DataView(ifd.buffer);
  ifdView.setUint16(0, entries.length, true);
  entries.forEach((entry, index) => {
    const offset = 2 + index * 12;
    ifdView.setUint16(offset, entry.tag, true);
    ifdView.setUint16(offset + 2, entry.type, true);
    ifdView.setUint32(offset + 4, entry.count, true);
    if (entry.data.length <= 4) ifd.set(entry.data, offset + 8);
    else {
      ifdView.setUint32(offset + 8, externalOffset, true);
      const padded = pad4(entry.data);
      external.push(padded);
      externalOffset += padded.length;
    }
  });
  const pixelOffset = externalOffset;
  const stripEntry = entries.findIndex((entry) => entry.tag === 273);
  ifdView.setUint32(2 + stripEntry * 12 + 8, pixelOffset, true);
  const header = new Uint8Array(8);
  header.set([0x49, 0x49]);
  const headerView = new DataView(header.buffer);
  headerView.setUint16(2, 42, true);
  headerView.setUint32(4, ifdOffset, true);
  return [header, ifd, ...external, pixels];
}

export function encodeTiff(
  image: ImageData,
  options: TiffOptions = {},
): ArrayBuffer {
  const colorSpace = options.colorSpace ?? 'srgb';
  const resolution = options.resolution ?? 300;
  validateResolution(resolution);
  const pixels = new Uint8Array(convertRgbaColorSpace(image.data, colorSpace));
  return concat(
    ...encodeTiffParts(
      image.width,
      image.height,
      pixels,
      8,
      4,
      createIccProfile(colorSpace),
      resolution,
    ),
  ).buffer;
}

/** Encode visible editor layers as named TIFF pages without flattening them. */
export function encodeLayeredTiff(
  pages: LayeredTiffPage[],
  options: TiffOptions = {},
): ArrayBuffer {
  if (!pages.length || pages.length > 100)
    throw Error('Layered TIFF export supports 1 to 100 layers.');
  const colorSpace = options.colorSpace ?? 'srgb',
    resolution = options.resolution ?? 300,
    profile = createIccProfile(colorSpace),
    software = nullTerminated('LibreLayer 0.5'),
    prepared = pages.map((page, index) => {
      checkDimensions(page.image.width, page.image.height);
      if (!page.name || page.name.length > 255)
        throw Error(`Layer ${index + 1} needs a name up to 255 characters.`);
      const pixels = new Uint8Array(
          convertRgbaColorSpace(page.image.data, colorSpace),
        ),
        pageName = nullTerminated(page.name),
        entries: TiffEntry[] = [
          { tag: 256, type: 4, count: 1, data: u32([page.image.width]) },
          { tag: 257, type: 4, count: 1, data: u32([page.image.height]) },
          { tag: 258, type: 3, count: 4, data: u16([8, 8, 8, 8]) },
          { tag: 259, type: 3, count: 1, data: u16([1]) },
          { tag: 262, type: 3, count: 1, data: u16([2]) },
          { tag: 273, type: 4, count: 1, data: u32([0]) },
          { tag: 274, type: 3, count: 1, data: u16([1]) },
          { tag: 277, type: 3, count: 1, data: u16([4]) },
          { tag: 278, type: 4, count: 1, data: u32([page.image.height]) },
          { tag: 279, type: 4, count: 1, data: u32([pixels.length]) },
          { tag: 282, type: 5, count: 1, data: rational(resolution) },
          { tag: 283, type: 5, count: 1, data: rational(resolution) },
          { tag: 284, type: 3, count: 1, data: u16([1]) },
          { tag: 285, type: 2, count: pageName.length, data: pageName },
          { tag: 296, type: 3, count: 1, data: u16([2]) },
          { tag: 305, type: 2, count: software.length, data: software },
          { tag: 338, type: 3, count: 1, data: u16([2]) },
          { tag: 339, type: 3, count: 4, data: u16([1, 1, 1, 1]) },
          { tag: 34675, type: 7, count: profile.length, data: profile },
        ];
      entries.sort((left, right) => left.tag - right.tag);
      const ifdSize = 2 + entries.length * 12 + 4,
        externalSize = entries.reduce(
          (sum, entry) =>
            sum + (entry.data.length > 4 ? pad4(entry.data).length : 0),
          0,
        );
      return { entries, pixels, ifdSize, externalSize };
    });
  validateResolution(resolution);
  let cursor = 8;
  const offsets = prepared.map((page) => {
    const start = cursor;
    cursor += page.ifdSize + page.externalSize + page.pixels.length;
    return start;
  });
  const output = new Uint8Array(cursor),
    view = new DataView(output.buffer);
  output.set([0x49, 0x49]);
  view.setUint16(2, 42, true);
  view.setUint32(4, offsets[0], true);
  prepared.forEach((page, pageIndex) => {
    const ifdOffset = offsets[pageIndex];
    view.setUint16(ifdOffset, page.entries.length, true);
    let externalOffset = ifdOffset + page.ifdSize;
    const pixelOffset = externalOffset + page.externalSize;
    page.entries.forEach((entry, entryIndex) => {
      const offset = ifdOffset + 2 + entryIndex * 12;
      view.setUint16(offset, entry.tag, true);
      view.setUint16(offset + 2, entry.type, true);
      view.setUint32(offset + 4, entry.count, true);
      if (entry.tag === 273) view.setUint32(offset + 8, pixelOffset, true);
      else if (entry.data.length <= 4) output.set(entry.data, offset + 8);
      else {
        view.setUint32(offset + 8, externalOffset, true);
        const padded = pad4(entry.data);
        output.set(padded, externalOffset);
        externalOffset += padded.length;
      }
    });
    view.setUint32(
      ifdOffset + 2 + page.entries.length * 12,
      offsets[pageIndex + 1] ?? 0,
      true,
    );
    output.set(page.pixels, pixelOffset);
  });
  return output.buffer;
}

/** Export a RAW master without passing through the browser's 8-bit canvas. */
export function encodeRawTiff16(
  source: HighPrecisionRawSource,
  options: TiffOptions = {},
) {
  const colorSpace = options.colorSpace ?? 'prophoto-rgb';
  const resolution = options.resolution ?? 300;
  validateResolution(resolution);
  checkDimensions(source.image.width, source.image.height);
  const developed = developRawRgb16(source.image, source.settings, colorSpace);
  const parts = encodeTiffParts(
    developed.width,
    developed.height,
    developed.data,
    16,
    3,
    createIccProfile(colorSpace),
    resolution,
  );
  return new Blob(parts as unknown as BlobPart[], { type: 'image/tiff' });
}

function encodePdf(jpeg: Uint8Array, width: number, height: number): Blob {
  const encode = (value: string) => new TextEncoder().encode(value),
    chunks: Uint8Array[] = [],
    offsets = [0];
  let position = 0;
  const push = (bytes: Uint8Array) => {
    chunks.push(bytes);
    position += bytes.length;
  };
  push(encode('%PDF-1.4\n'));
  const pageW = width * 0.75,
    pageH = height * 0.75;
  const object = (id: number, body: string, bytes?: Uint8Array) => {
    offsets[id] = position;
    push(encode(`${id} 0 obj\n${body}`));
    if (bytes) {
      push(encode('\nstream\n'));
      push(bytes);
      push(encode('\nendstream'));
    }
    push(encode('\nendobj\n'));
  };
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
  );
  object(
    4,
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`,
    jpeg,
  );
  const commands = encode(`q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`);
  object(5, `<< /Length ${commands.length} >>`, commands);
  const xref = position;
  push(
    encode(
      `xref\n0 6\n0000000000 65535 f \n${offsets
        .slice(1)
        .map((value) => String(value).padStart(10, '0') + ' 00000 n \n')
        .join(
          '',
        )}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`,
    ),
  );
  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

export async function encodeImage(
  source: HTMLCanvasElement,
  format: ExportFormat,
  quality: number,
  scale: number,
  matte: string,
  tiffOptions: TiffOptions = {},
): Promise<Blob> {
  if (
    !Number.isFinite(scale) ||
    scale < 0.1 ||
    scale > 2 ||
    !Number.isFinite(quality) ||
    quality < 1 ||
    quality > 100
  )
    throw Error('Choose a valid size and quality.');
  const width = Math.max(1, Math.round(source.width * scale)),
    height = Math.max(1, Math.round(source.height * scale));
  checkDimensions(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  if (format === 'jpeg' || format === 'pdf' || matte !== 'transparent') {
    context.fillStyle = matte === 'transparent' ? '#ffffff' : matte;
    context.fillRect(0, 0, width, height);
  }
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, width, height);
  if (format === 'tiff')
    return new Blob(
      [encodeTiff(context.getImageData(0, 0, width, height), tiffOptions)],
      { type: 'image/tiff' },
    );
  const mime = format === 'pdf' ? 'image/jpeg' : `image/${format}`;
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) =>
        result && result.type === mime
          ? resolve(result)
          : reject(Error('This browser cannot encode the selected format.')),
      mime,
      quality / 100,
    ),
  );
  return format === 'pdf'
    ? encodePdf(new Uint8Array(await blob.arrayBuffer()), width, height)
    : blob;
}
