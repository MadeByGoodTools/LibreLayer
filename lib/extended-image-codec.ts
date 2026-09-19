import { checkDimensions, checkFileSize } from './document-limits.ts';
import { precisionToDisplayRgba } from './high-depth.ts';

export type ExtendedFrame = {
  image: ImageData;
  duration: number;
  precisionData?: { width: number; height: number; data: Float32Array };
};
export type ExtendedExportFormat =
  | 'avif'
  | 'jxl'
  | 'heic'
  | 'jpeg2000'
  | 'hdr'
  | 'exr';

const extension = (name: string) => name.toLowerCase().match(/\.([^.]+)$/)?.[1];

export function extendedImageKind(file: Pick<File, 'name' | 'type'>) {
  const ext = extension(file.name);
  if (ext === 'exr') return 'exr';
  if (ext === 'hdr' || ext === 'rgbe') return 'hdr';
  if (ext === 'jxl' || file.type === 'image/jxl') return 'jxl';
  if (['jp2', 'j2k', 'jpf', 'jpx', 'jpm', 'mj2'].includes(ext ?? ''))
    return 'jpeg2000';
  if (
    ['heic', 'heif'].includes(ext ?? '') ||
    ['image/heic', 'image/heif'].includes(file.type)
  )
    return 'heic';
  if (ext === 'avif' || file.type === 'image/avif') return 'avif';
  if (ext === 'webp' || file.type === 'image/webp') return 'webp';
  return undefined;
}

const image = (
  width: number,
  height: number,
  data: Uint8Array | Uint8ClampedArray,
) => {
  checkDimensions(width, height);
  if (data.length !== width * height * 4)
    throw Error('Decoded image pixels do not match its dimensions.');
  return new ImageData(new Uint8ClampedArray(data), width, height);
};

const rgbeToFloat = (r: number, g: number, b: number, exponent: number) => {
  if (!exponent) return [0, 0, 0] as const;
  const scale = 2 ** (exponent - 136);
  return [r * scale, g * scale, b * scale] as const;
};

export function decodeRadianceHdr(buffer: ArrayBuffer): ExtendedFrame {
  const bytes = new Uint8Array(buffer);
  if (
    bytes.length < 32 ||
    new TextDecoder().decode(bytes.slice(0, 10)) !== '#?RADIANCE'
  )
    throw Error('This is not a Radiance HDR image.');
  let offset = 0;
  const line = () => {
    const start = offset;
    while (offset < bytes.length && bytes[offset] !== 10) offset++;
    if (offset >= bytes.length) throw Error('Truncated Radiance HDR header.');
    return new TextDecoder().decode(bytes.slice(start, offset++)).trim();
  };
  let header = line();
  if (header !== '#?RADIANCE') throw Error('Invalid Radiance HDR signature.');
  let format = '';
  while ((header = line()))
    if (header.startsWith('FORMAT=')) format = header.slice(7);
  if (format !== '32-bit_rle_rgbe')
    throw Error('Only standard 32-bit RGBE Radiance HDR files are supported.');
  const dimensions = line().match(/^-Y\s+(\d+)\s+\+X\s+(\d+)$/);
  if (!dimensions)
    throw Error('Radiance HDR orientation must be -Y height +X width.');
  const height = Number(dimensions[1]),
    width = Number(dimensions[2]);
  checkDimensions(width, height);
  const rgbe = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    if (
      width >= 8 &&
      width <= 0x7fff &&
      bytes[offset] === 2 &&
      bytes[offset + 1] === 2 &&
      (bytes[offset + 2] & 0x80) === 0
    ) {
      const scanWidth = (bytes[offset + 2] << 8) | bytes[offset + 3];
      offset += 4;
      if (scanWidth !== width) throw Error('Invalid Radiance HDR scanline.');
      for (let channel = 0; channel < 4; channel++) {
        let x = 0;
        while (x < width) {
          const count = bytes[offset++];
          if (!count) throw Error('Invalid Radiance HDR run length.');
          if (count > 128) {
            const run = count - 128,
              value = bytes[offset++];
            if (x + run > width)
              throw Error('Radiance HDR run exceeds scanline.');
            for (let at = 0; at < run; at++)
              rgbe[(y * width + x++) * 4 + channel] = value;
          } else {
            if (x + count > width || offset + count > bytes.length)
              throw Error('Truncated Radiance HDR scanline.');
            for (let at = 0; at < count; at++)
              rgbe[(y * width + x++) * 4 + channel] = bytes[offset++];
          }
        }
      }
    } else {
      const length = width * 4;
      if (offset + length > bytes.length)
        throw Error('Truncated Radiance HDR pixels.');
      rgbe.set(bytes.subarray(offset, offset + length), y * length);
      offset += length;
    }
  }
  const data = new Float32Array(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel++) {
    const at = pixel * 4,
      rgb = rgbeToFloat(rgbe[at], rgbe[at + 1], rgbe[at + 2], rgbe[at + 3]);
    data[at] = rgb[0];
    data[at + 1] = rgb[1];
    data[at + 2] = rgb[2];
    data[at + 3] = 1;
  }
  return {
    image: new ImageData(
      precisionToDisplayRgba({ width, height, data }),
      width,
      height,
    ),
    duration: 0,
    precisionData: { width, height, data },
  };
}

const decodeAnimation = async (buffer: ArrayBuffer, type: string) => {
  const Decoder = (
    globalThis as unknown as {
      ImageDecoder?: new (input: { data: Uint8Array; type: string }) => {
        tracks: {
          ready: Promise<void>;
          selectedTrack?: { frameCount: number };
        };
        decode: (options: { frameIndex: number }) => Promise<{
          image: CanvasImageSource & {
            displayWidth: number;
            displayHeight: number;
            duration?: number;
            close: () => void;
          };
        }>;
        close: () => void;
      };
    }
  ).ImageDecoder;
  if (!Decoder) return [];
  const decoder = new Decoder({ data: new Uint8Array(buffer), type });
  try {
    await decoder.tracks.ready;
    const count = decoder.tracks.selectedTrack?.frameCount ?? 1;
    if (count < 2 || count > 500) return [];
    const frames: ExtendedFrame[] = [];
    for (let index = 0; index < count; index++) {
      const { image: frame } = await decoder.decode({ frameIndex: index }),
        canvas = new OffscreenCanvas(frame.displayWidth, frame.displayHeight),
        context = canvas.getContext('2d');
      if (!context) throw Error('Animated image canvas is unavailable.');
      context.drawImage(frame, 0, 0);
      frames.push({
        image: context.getImageData(0, 0, canvas.width, canvas.height),
        duration: Math.max(0, Math.round((frame.duration ?? 0) / 1000)),
      });
      frame.close();
    }
    return frames;
  } finally {
    decoder.close();
  }
};

export async function decodeExtendedImage(
  file: File,
): Promise<ExtendedFrame[]> {
  checkFileSize(file.size);
  const kind = extendedImageKind(file);
  if (!kind) throw Error('This extended image format is not recognized.');
  const buffer = await file.arrayBuffer();
  if (kind === 'hdr') return [decodeRadianceHdr(buffer)];
  if (kind === 'webp') {
    const frames = await decodeAnimation(buffer.slice(0), 'image/webp');
    if (frames.length) return frames;
    const { default: decode } = await import('@jsquash/webp/decode.js'),
      decoded = await decode(buffer);
    if (!decoded) throw Error('The WebP decoder returned no pixels.');
    return [
      {
        image: image(decoded.width, decoded.height, decoded.data),
        duration: 0,
      },
    ];
  }
  if (kind === 'avif') {
    const { default: decode } = await import('@jsquash/avif/decode.js'),
      decoded = await decode(buffer);
    if (!decoded) throw Error('The AVIF decoder returned no pixels.');
    return [
      {
        image: image(decoded.width, decoded.height, decoded.data),
        duration: 0,
      },
    ];
  }
  if (kind === 'jxl') {
    const { default: decode } = await import('@jsquash/jxl/decode.js'),
      decoded = await decode(buffer);
    if (!decoded) throw Error('The JPEG XL decoder returned no pixels.');
    return [
      {
        image: image(decoded.width, decoded.height, decoded.data),
        duration: 0,
      },
    ];
  }
  if (kind === 'jpeg2000') {
    const { JpxImage } = await import('jpeg2000'),
      decoded = new JpxImage();
    decoded.parse(new Uint8Array(buffer));
    checkDimensions(decoded.width, decoded.height);
    if (![1, 3, 4].includes(decoded.componentsCount))
      throw Error('JPEG 2000 must contain grayscale, RGB, or RGBA pixels.');
    const rgba = new Uint8ClampedArray(decoded.width * decoded.height * 4);
    for (const tile of decoded.tiles)
      for (let y = 0; y < tile.height; y++)
        for (let x = 0; x < tile.width; x++) {
          const source = (y * tile.width + x) * decoded.componentsCount,
            target = ((tile.top + y) * decoded.width + tile.left + x) * 4;
          rgba[target] = tile.items[source];
          rgba[target + 1] =
            decoded.componentsCount === 1
              ? tile.items[source]
              : tile.items[source + 1];
          rgba[target + 2] =
            decoded.componentsCount === 1
              ? tile.items[source]
              : tile.items[source + 2];
          rgba[target + 3] =
            decoded.componentsCount === 4 ? tile.items[source + 3] : 255;
        }
    return [{ image: image(decoded.width, decoded.height, rgba), duration: 0 }];
  }
  if (kind === 'exr') {
    const { default: parseExr } = await import('parse-exr'),
      decoded = parseExr(buffer, 1015),
      source = decoded.data as Float32Array,
      data = new Float32Array(decoded.width * decoded.height * 4);
    checkDimensions(decoded.width, decoded.height);
    if (decoded.format === 1028)
      for (let pixel = 0; pixel < decoded.width * decoded.height; pixel++) {
        data[pixel * 4] =
          data[pixel * 4 + 1] =
          data[pixel * 4 + 2] =
            source[pixel];
        data[pixel * 4 + 3] = 1;
      }
    else data.set(source);
    return [
      {
        image: new ImageData(
          precisionToDisplayRgba({
            width: decoded.width,
            height: decoded.height,
            data,
          }),
          decoded.width,
          decoded.height,
        ),
        duration: 0,
        precisionData: { width: decoded.width, height: decoded.height, data },
      },
    ];
  }
  const heic = (await import('heic-decode')) as unknown as {
      default?: (options: { buffer: ArrayBuffer }) => Promise<{
        width: number;
        height: number;
        data: Uint8ClampedArray;
      }>;
    },
    decode = heic.default;
  if (!decode) throw Error('The HEIC decoder could not load.');
  const decoded = await decode({ buffer });
  return [
    { image: image(decoded.width, decoded.height, decoded.data), duration: 0 },
  ];
}

const ascii = (value: string) => new TextEncoder().encode(value);
const little24 = (value: number) =>
  Uint8Array.from([value & 255, (value >>> 8) & 255, (value >>> 16) & 255]);
const little32 = (value: number) => {
  const output = new Uint8Array(4);
  new DataView(output.buffer).setUint32(0, value, true);
  return output;
};
const join = (...parts: Uint8Array[]) => {
  const output = new Uint8Array(
    parts.reduce((sum, part) => sum + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
};
const webpChunk = (fourcc: string, payload: Uint8Array) =>
  join(
    ascii(fourcc),
    little32(payload.length),
    payload,
    payload.length % 2 ? new Uint8Array(1) : new Uint8Array(),
  );

export async function encodeAnimatedWebp(
  frames: { image: ImageData; duration: number }[],
  quality = 90,
  loopCount = 0,
) {
  if (frames.length < 2 || frames.length > 500)
    throw Error('Animated WebP export needs 2 to 500 frames.');
  const width = frames[0].image.width,
    height = frames[0].image.height;
  checkDimensions(width, height);
  if (
    frames.some(
      (frame) =>
        frame.image.width !== width ||
        frame.image.height !== height ||
        !Number.isFinite(frame.duration) ||
        frame.duration < 1 ||
        frame.duration > 0xffffff,
    )
  )
    throw Error(
      'Animated WebP frames need matching dimensions and valid timing.',
    );
  const { default: encode } = await import('@jsquash/webp/encode.js'),
    chunks: Uint8Array[] = [];
  for (const frame of frames) {
    const still = new Uint8Array(
      await encode(frame.image, {
        quality: Math.max(0, Math.min(100, quality)),
      }),
    );
    if (
      new TextDecoder().decode(still.slice(0, 4)) !== 'RIFF' ||
      new TextDecoder().decode(still.slice(8, 12)) !== 'WEBP'
    )
      throw Error('The WebP frame encoder returned an invalid image.');
    const payload = still.slice(12),
      header = join(
        little24(0),
        little24(0),
        little24(width - 1),
        little24(height - 1),
        little24(Math.round(frame.duration)),
        Uint8Array.from([0]),
      );
    chunks.push(webpChunk('ANMF', join(header, payload)));
  }
  const vp8x = new Uint8Array(10);
  vp8x[0] = 0x02;
  vp8x.set(little24(width - 1), 4);
  vp8x.set(little24(height - 1), 7);
  const animation = new Uint8Array(6);
  new DataView(animation.buffer).setUint16(
    4,
    Math.max(0, Math.min(65535, loopCount)),
    true,
  );
  const body = join(
    webpChunk('VP8X', vp8x),
    webpChunk('ANIM', animation),
    ...chunks,
  );
  return join(ascii('RIFF'), little32(body.length + 4), ascii('WEBP'), body)
    .buffer;
}

export function encodeRadianceHdr(imageData: ImageData) {
  checkDimensions(imageData.width, imageData.height);
  const header = ascii(
      `#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${imageData.height} +X ${imageData.width}\n`,
    ),
    pixels = new Uint8Array(imageData.width * imageData.height * 4);
  for (let pixel = 0; pixel < imageData.width * imageData.height; pixel++) {
    const source = pixel * 4,
      red = imageData.data[source] / 255,
      green = imageData.data[source + 1] / 255,
      blue = imageData.data[source + 2] / 255,
      maximum = Math.max(red, green, blue);
    if (!maximum) continue;
    const exponent = Math.ceil(Math.log2(maximum)),
      scale = 2 ** (8 - exponent);
    pixels[source] = Math.min(255, Math.round(red * scale));
    pixels[source + 1] = Math.min(255, Math.round(green * scale));
    pixels[source + 2] = Math.min(255, Math.round(blue * scale));
    pixels[source + 3] = exponent + 128;
  }
  return join(header, pixels).buffer;
}

export async function encodeExtendedImage(
  imageData: ImageData,
  format: ExtendedExportFormat,
  quality: number,
) {
  checkDimensions(imageData.width, imageData.height);
  if (!Number.isFinite(quality) || quality < 1 || quality > 100)
    throw Error('Choose a quality from 1 to 100.');
  if (format === 'hdr') return encodeRadianceHdr(imageData);
  if (format === 'exr') return encodeOpenExr(imageData);
  if (format === 'heic') {
    const { heic } = await import('@pbk20191/icodec');
    await heic.loadEncoder();
    const encoded = heic.encode(
      {
        data: imageData.data,
        width: imageData.width,
        height: imageData.height,
        depth: 8,
      },
      { quality, preset: 'ultrafast' },
    );
    return new Uint8Array(encoded).slice().buffer;
  }
  if (format === 'jpeg2000') return encodeJpeg2000(imageData, quality);
  if (format === 'avif') {
    const { default: encode } = await import('@jsquash/avif/encode.js');
    return encode(imageData, {
      quality,
      qualityAlpha: quality,
    });
  }
  const { default: encode } = await import('@jsquash/jxl/encode.js');
  return encode(imageData, { quality });
}

/** Encode a standards-compliant JPEG 2000 raw codestream with OpenJPEG. */
export async function encodeJpeg2000(imageData: ImageData, quality = 100) {
  checkDimensions(imageData.width, imageData.height);
  const { default: createOpenJpeg } =
      await import('@cornerstonejs/codec-openjpeg'),
    codec = await createOpenJpeg(),
    encoder = new codec.J2KEncoder();
  try {
    const pixels = new Uint8Array(imageData.width * imageData.height * 3);
    for (let pixel = 0; pixel < imageData.width * imageData.height; pixel++) {
      pixels[pixel * 3] = imageData.data[pixel * 4];
      pixels[pixel * 3 + 1] = imageData.data[pixel * 4 + 1];
      pixels[pixel * 3 + 2] = imageData.data[pixel * 4 + 2];
    }
    encoder
      .getDecodedBuffer({
        width: imageData.width,
        height: imageData.height,
        bitsPerSample: 8,
        componentCount: 3,
        isSigned: false,
      })
      .set(pixels);
    const lossless = quality >= 100;
    encoder.setQuality(lossless, 1);
    encoder.setCompressionRatio(
      0,
      lossless ? 1 : 1 + ((100 - Math.max(1, quality)) / 99) * 19,
    );
    encoder.setDecompositions(
      Math.max(
        0,
        Math.min(
          5,
          Math.floor(Math.log2(Math.min(imageData.width, imageData.height))),
        ),
      ),
    );
    encoder.encode();
    const encoded = new Uint8Array(encoder.getEncodedBuffer());
    if (encoded.length < 4 || encoded[0] !== 0xff || encoded[1] !== 0x4f)
      throw Error('JPEG 2000 encoder returned an invalid codestream.');
    return encoded.buffer;
  } finally {
    encoder.delete();
  }
}

const nullString = (value: string) => join(ascii(value), new Uint8Array(1));
const le32 = (value: number) => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setInt32(0, value, true);
  return bytes;
};
const leFloat = (value: number) => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setFloat32(0, value, true);
  return bytes;
};
const exrAttribute = (name: string, type: string, data: Uint8Array) =>
  join(nullString(name), nullString(type), le32(data.length), data);

/** Encode an uncompressed, scanline-based, 32-bit floating-point OpenEXR. */
export function encodeOpenExr(imageData: ImageData) {
  checkDimensions(imageData.width, imageData.height);
  const channel = (name: string) =>
      join(nullString(name), le32(2), new Uint8Array(4), le32(1), le32(1)),
    channels = join(
      channel('B'),
      channel('G'),
      channel('R'),
      channel('A'),
      new Uint8Array(1),
    ),
    box = join(
      le32(0),
      le32(0),
      le32(imageData.width - 1),
      le32(imageData.height - 1),
    ),
    header = join(
      Uint8Array.from([0x76, 0x2f, 0x31, 0x01]),
      Uint8Array.from([2, 0, 0, 0]),
      exrAttribute('channels', 'chlist', channels),
      exrAttribute('compression', 'compression', new Uint8Array([0])),
      exrAttribute('dataWindow', 'box2i', box),
      exrAttribute('displayWindow', 'box2i', box),
      exrAttribute('lineOrder', 'lineOrder', new Uint8Array([0])),
      exrAttribute('pixelAspectRatio', 'float', leFloat(1)),
      exrAttribute('screenWindowCenter', 'v2f', join(leFloat(0), leFloat(0))),
      exrAttribute('screenWindowWidth', 'float', leFloat(1)),
      new Uint8Array(1),
    ),
    bytesPerScanline = imageData.width * 4 * 4,
    chunkSize = 8 + bytesPerScanline,
    offsets = new Uint8Array(imageData.height * 8),
    chunks: Uint8Array[] = [],
    firstChunk = header.length + offsets.length,
    view = new DataView(offsets.buffer),
    linear = (value: number) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  for (let y = 0; y < imageData.height; y++) {
    view.setBigUint64(y * 8, BigInt(firstChunk + y * chunkSize), true);
    const payload = new Uint8Array(bytesPerScanline),
      payloadView = new DataView(payload.buffer),
      order = [2, 1, 0, 3];
    let offset = 0;
    for (const component of order)
      for (let x = 0; x < imageData.width; x++) {
        const encoded =
          imageData.data[(y * imageData.width + x) * 4 + component] / 255;
        payloadView.setFloat32(
          offset,
          component === 3 ? encoded : linear(encoded),
          true,
        );
        offset += 4;
      }
    chunks.push(join(le32(y), le32(payload.length), payload));
  }
  return join(header, offsets, ...chunks).buffer;
}
