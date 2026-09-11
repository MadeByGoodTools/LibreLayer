export type RawLinearImage = {
  width: number;
  height: number;
  data: Float32Array;
  bitDepth: number;
  camera: string;
  lens: string;
};

export type RawDevelopSettings = {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  temperature: number;
  tint: number;
  vibrance: number;
  saturation: number;
  highlightRecovery: number;
};

export const defaultRawDevelopSettings: RawDevelopSettings = {
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
};

const clamp = (value: number, low = 0, high = 1) =>
  Math.max(low, Math.min(high, value));

const multiply3 = (matrix: number[], vector: number[]) => [
  matrix[0] * vector[0] + matrix[1] * vector[1] + matrix[2] * vector[2],
  matrix[3] * vector[0] + matrix[4] * vector[1] + matrix[5] * vector[2],
  matrix[6] * vector[0] + matrix[7] * vector[1] + matrix[8] * vector[2],
];

const proPhotoToXyzD50 = [
  0.7976749, 0.1351917, 0.0313534, 0.2880402, 0.7118741, 0.0000857, 0, 0,
  0.82521,
];
const d50ToD65 = [
  0.9555766, -0.0230393, 0.0631636, -0.0282895, 1.0099416, 0.0210077, 0.0122982,
  -0.020483, 1.3299098,
];
const xyzD65ToSrgb = [
  3.2406, -1.5372, -0.4986, -0.9689, 1.8758, 0.0415, 0.0557, -0.204, 1.057,
];

const encodeSrgb = (value: number) => {
  const safe = clamp(value);
  return safe <= 0.0031308 ? safe * 12.92 : 1.055 * safe ** (1 / 2.4) - 0.055;
};

export async function decodeCameraRaw(file: Blob): Promise<RawLinearImage> {
  const { default: LibRaw } = await import('libraw-wasm');
  const decoder = new LibRaw();
  try {
    await decoder.open(new Uint8Array(await file.arrayBuffer()), {
      useCameraWb: true,
      useCameraMatrix: 3,
      outputBps: 16,
      outputColor: 4,
      userQual: 11,
      highlight: 5,
      greenMatching: true,
      fbddNoiserd: 1,
      medPasses: 1,
      gamm: [1, 1],
      noAutoBright: true,
    });
    const [decoded, metadata] = await Promise.all([
      decoder.imageData(),
      decoder.metadata(true),
    ]);
    if (!decoded?.data || !decoded.width || !decoded.height)
      throw new Error('The sensor data did not produce editable pixels.');
    const channels = Math.max(1, decoded.colors || 3);
    const maximum = decoded.data instanceof Uint16Array ? 65535 : 255;
    const data = new Float32Array(decoded.width * decoded.height * 3);
    for (let pixel = 0; pixel < decoded.width * decoded.height; pixel++) {
      const source = pixel * channels;
      const target = pixel * 3;
      data[target] = Number(decoded.data[source] ?? 0) / maximum;
      data[target + 1] =
        Number(decoded.data[source + Math.min(1, channels - 1)] ?? 0) / maximum;
      data[target + 2] =
        Number(decoded.data[source + Math.min(2, channels - 1)] ?? 0) / maximum;
    }
    return {
      width: decoded.width,
      height: decoded.height,
      data,
      bitDepth: decoded.bits || 16,
      camera: [metadata?.camera_make, metadata?.camera_model]
        .filter(Boolean)
        .join(' '),
      lens: metadata?.lens?.Lens ?? metadata?.lens?.makernotes?.Lens ?? '',
    };
  } finally {
    decoder.dispose();
  }
}

function bilinear(
  image: RawLinearImage,
  x: number,
  y: number,
  channel: number,
) {
  const x0 = Math.max(0, Math.min(image.width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(image.height - 1, Math.floor(y)));
  const x1 = Math.min(image.width - 1, x0 + 1);
  const y1 = Math.min(image.height - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const a = image.data[(y0 * image.width + x0) * 3 + channel];
  const b = image.data[(y0 * image.width + x1) * 3 + channel];
  const c = image.data[(y1 * image.width + x0) * 3 + channel];
  const d = image.data[(y1 * image.width + x1) * 3 + channel];
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}

function developPixel(rgb: number[], settings: RawDevelopSettings) {
  const gain = 2 ** settings.exposure;
  const warmth = settings.temperature / 300;
  const tint = settings.tint / 350;
  let r = rgb[0] * gain * (1 + warmth + tint * 0.22);
  let g = rgb[1] * gain * (1 - tint * 0.42);
  let b = rgb[2] * gain * (1 - warmth + tint * 0.18);
  let luma = Math.max(0, 0.288 * r + 0.712 * g + 0.0001 * b);
  const shadowWeight = (1 - clamp(luma)) ** 2;
  const highlightWeight = clamp(luma) ** 2;
  const tonalGain =
    1 +
    (settings.shadows / 100) * shadowWeight * 0.78 +
    (settings.highlights / 100) * highlightWeight * 0.62;
  const lift =
    (settings.blacks / 100) * shadowWeight * 0.09 +
    (settings.whites / 100) * highlightWeight * 0.14;
  r = r * tonalGain + lift;
  g = g * tonalGain + lift;
  b = b * tonalGain + lift;

  const recovery = clamp(settings.highlightRecovery / 100);
  const recover = (value: number) =>
    value / (1 + Math.max(0, value - 0.72) * recovery * 1.9);
  r = recover(r);
  g = recover(g);
  b = recover(b);

  const contrast = 2 ** (settings.contrast / 100);
  const pivot = 0.18;
  const contrastAroundPivot = (value: number) =>
    pivot * Math.sign(value / pivot) * Math.abs(value / pivot) ** contrast;
  r = contrastAroundPivot(r);
  g = contrastAroundPivot(g);
  b = contrastAroundPivot(b);

  luma = Math.max(0, 0.288 * r + 0.712 * g + 0.0001 * b);
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const saturation = Math.max(
    0,
    1 +
      settings.saturation / 100 +
      (settings.vibrance / 100) * (1 - clamp(chroma)),
  );
  r = luma + (r - luma) * saturation;
  g = luma + (g - luma) * saturation;
  b = luma + (b - luma) * saturation;

  const xyzD50 = multiply3(proPhotoToXyzD50, [r, g, b]);
  const xyzD65 = multiply3(d50ToD65, xyzD50);
  return multiply3(xyzD65ToSrgb, xyzD65).map(encodeSrgb);
}

export function developRawRgba(
  image: RawLinearImage,
  settings: RawDevelopSettings,
  maximumEdge = 0,
) {
  const scale = maximumEdge
    ? Math.min(1, maximumEdge / Math.max(image.width, image.height))
    : 1;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sourceY = ((y + 0.5) / height) * image.height - 0.5;
    for (let x = 0; x < width; x++) {
      const sourceX = ((x + 0.5) / width) * image.width - 0.5;
      const rgb = developPixel(
        [0, 1, 2].map((channel) => bilinear(image, sourceX, sourceY, channel)),
        settings,
      );
      const target = (y * width + x) * 4;
      data[target] = Math.round(rgb[0] * 255);
      data[target + 1] = Math.round(rgb[1] * 255);
      data[target + 2] = Math.round(rgb[2] * 255);
      data[target + 3] = 255;
    }
  }
  return { width, height, data };
}
