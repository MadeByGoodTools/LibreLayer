import { checkDimensions, checkFileSize } from './document-limits.ts';

const MARKER = '%%BeginLibreLayerPixels:';

export function encodeEps(image: ImageData) {
  checkDimensions(image.width, image.height);
  const hex: string[] = [];
  for (let offset = 0; offset < image.data.length; offset += 4) {
    const alpha = image.data[offset + 3] / 255;
    for (let channel = 0; channel < 3; channel++)
      hex.push(
        Math.round(image.data[offset + channel] * alpha + 255 * (1 - alpha))
          .toString(16)
          .padStart(2, '0'),
      );
  }
  const rows =
    hex
      .join('')
      .match(/.{1,120}/g)
      ?.join('\n') ?? '';
  return new TextEncoder().encode(
    `%!PS-Adobe-3.0 EPSF-3.0\n%%Creator: LibreLayer\n%%BoundingBox: 0 0 ${image.width} ${image.height}\n%%LanguageLevel: 2\n${MARKER} ${image.width} ${image.height} 3\n/picstr ${image.width * 3} string def\n${image.width} ${image.height} 8\n[${image.width} 0 0 -${image.height} 0 ${image.height}]\n{ currentfile picstr readhexstring pop } false 3 colorimage\n${rows}\n%%EndLibreLayerPixels\nshowpage\n%%EOF\n`,
  ).buffer;
}

export function decodeEps(buffer: ArrayBuffer) {
  checkFileSize(buffer.byteLength);
  const bytes = new Uint8Array(buffer),
    view = new DataView(buffer);
  if (bytes.length >= 30 && view.getUint32(0, true) === 0xc6d3d0c5) {
    const offset = view.getUint32(20, true),
      length = view.getUint32(24, true);
    if (!length || offset + length > bytes.length)
      throw Error('The EPS TIFF preview is truncated.');
    return { tiffPreview: buffer.slice(offset, offset + length) };
  }
  const text = new TextDecoder('latin1').decode(bytes);
  if (!text.startsWith('%!PS-Adobe')) throw Error('This is not an EPS file.');
  const marker = text.match(
    /%%BeginLibreLayerPixels:\s+(\d+)\s+(\d+)\s+3\s*\n([\s\S]*?)%%EndLibreLayerPixels/,
  );
  if (!marker)
    throw Error(
      'This EPS has no supported TIFF preview or LibreLayer raster payload.',
    );
  const width = Number(marker[1]),
    height = Number(marker[2]);
  checkDimensions(width, height);
  const colorImage = marker[3].indexOf('colorimage');
  if (colorImage < 0) throw Error('The EPS raster payload is malformed.');
  const hex = marker[3]
    .slice(colorImage + 'colorimage'.length)
    .replace(/\s/g, '');
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length !== width * height * 6)
    throw Error('The EPS raster payload is truncated.');
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel++) {
    const input = pixel * 6,
      output = pixel * 4;
    rgba[output] = Number.parseInt(hex.slice(input, input + 2), 16);
    rgba[output + 1] = Number.parseInt(hex.slice(input + 2, input + 4), 16);
    rgba[output + 2] = Number.parseInt(hex.slice(input + 4, input + 6), 16);
    rgba[output + 3] = 255;
  }
  return { image: new ImageData(rgba, width, height) };
}
