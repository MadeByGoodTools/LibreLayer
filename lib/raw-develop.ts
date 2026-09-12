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
  noise?: RawNoiseCorrection;
  lensCorrection?: RawLensCorrection;
};

export type RawOutputColorSpace =
  | 'srgb'
  | 'display-p3'
  | 'adobe-rgb'
  | 'prophoto-rgb';

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
  noise: defaultRawNoiseCorrection(),
  lensCorrection: defaultRawLensCorrection(),
};

export function isRawDevelopSettings(
  value: unknown,
): value is RawDevelopSettings {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Record<string, unknown>;
  const ranges: Record<string, [number, number]> = {
    exposure: [-5, 5],
    contrast: [-100, 100],
    highlights: [-100, 100],
    shadows: [-100, 100],
    whites: [-100, 100],
    blacks: [-100, 100],
    temperature: [-100, 100],
    tint: [-100, 100],
    vibrance: [-100, 100],
    saturation: [-100, 100],
    highlightRecovery: [0, 100],
  };
  const coreValid = Object.entries(ranges).every(
    ([key, [minimum, maximum]]) =>
      Number.isFinite(settings[key]) &&
      Number(settings[key]) >= minimum &&
      Number(settings[key]) <= maximum,
  );
  if (!coreValid) return false;
  if (settings.noise !== undefined) {
    if (!settings.noise || typeof settings.noise !== 'object') return false;
    const noise = settings.noise as Record<string, unknown>;
    const normalized = normalizeRawNoiseCorrection(
      settings.noise as Partial<RawNoiseCorrection>,
    );
    if (
      !Object.entries(normalized).every(
        ([key, expected]) => noise[key] === expected,
      )
    )
      return false;
  }
  if (settings.lensCorrection !== undefined) {
    if (!settings.lensCorrection || typeof settings.lensCorrection !== 'object')
      return false;
    const lensCorrection = settings.lensCorrection as Record<string, unknown>;
    const normalized = normalizeRawLensCorrection(
      settings.lensCorrection as Partial<RawLensCorrection>,
    );
    if (
      !Object.entries(normalized).every(
        ([key, expected]) => lensCorrection[key] === expected,
      )
    )
      return false;
  }
  return true;
}

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
const xyzD65ToDisplayP3 = [
  2.4935, -0.9314, -0.4027, -0.8295, 1.7627, 0.0236, 0.0358, -0.0762, 0.9569,
];
const xyzD65ToAdobeRgb = [
  2.0416, -0.565, -0.3447, -0.9692, 1.876, 0.0416, 0.0134, -0.1184, 1.0154,
];

const encodeSrgb = (value: number) => {
  const safe = clamp(value);
  return safe <= 0.0031308 ? safe * 12.92 : 1.055 * safe ** (1 / 2.4) - 0.055;
};

function encodeProPhotoPixel(
  proPhoto: number[],
  colorSpace: RawOutputColorSpace,
) {
  if (colorSpace === 'prophoto-rgb')
    return proPhoto.map((value) => {
      const safe = clamp(value);
      return safe < 1 / 512 ? safe * 16 : safe ** (1 / 1.8);
    });
  const xyzD50 = multiply3(proPhotoToXyzD50, proPhoto);
  const xyzD65 = multiply3(d50ToD65, xyzD50);
  const target = multiply3(
    colorSpace === 'srgb'
      ? xyzD65ToSrgb
      : colorSpace === 'display-p3'
        ? xyzD65ToDisplayP3
        : xyzD65ToAdobeRgb,
    xyzD65,
  );
  return target.map((value) =>
    colorSpace === 'adobe-rgb'
      ? clamp(value) ** (1 / 2.19921875)
      : encodeSrgb(value),
  );
}

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

const prepareRawImage = (
  image: RawLinearImage,
  settings: RawDevelopSettings,
  maximumEdge = 0,
) => {
  const scale = maximumEdge
      ? Math.min(1, maximumEdge / Math.max(image.width, image.height))
      : 1,
    width = Math.max(1, Math.round(image.width * scale)),
    height = Math.max(1, Math.round(image.height * scale));
  let data: Float32Array;
  if (width === image.width && height === image.height)
    data = new Float32Array(image.data);
  else {
    data = new Float32Array(width * height * 3);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        for (let channel = 0; channel < 3; channel++)
          data[(y * width + x) * 3 + channel] = bilinear(
            image,
            ((x + 0.5) / width) * image.width - 0.5,
            ((y + 0.5) / height) * image.height - 0.5,
            channel,
          );
  }
  data = correctRawNoise(data, width, height, settings.noise);
  data = correctRawLens(
    data,
    width,
    height,
    settings.lensCorrection,
    image.lens,
  );
  return { ...image, width, height, data };
};

function adjustRawPixel(rgb: number[], settings: RawDevelopSettings) {
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

  return [r, g, b];
}

export function developRawRgba(
  image: RawLinearImage,
  settings: RawDevelopSettings,
  maximumEdge = 0,
) {
  const prepared = prepareRawImage(image, settings, maximumEdge),
    width = prepared.width,
    height = prepared.height;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sourceX = x;
      const rgb = encodeProPhotoPixel(
        adjustRawPixel(
          [0, 1, 2].map((channel) =>
            bilinear(prepared, sourceX, y, channel),
          ),
          settings,
        ),
        'srgb',
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

/** Develop the scene-linear RAW master directly into true 16-bit RGB samples. */
export function developRawRgb16(
  image: RawLinearImage,
  settings: RawDevelopSettings,
  colorSpace: RawOutputColorSpace,
) {
  const prepared = prepareRawImage(image, settings),
    data = new Uint8Array(prepared.width * prepared.height * 6);
  const view = new DataView(data.buffer);
  for (let pixel = 0; pixel < prepared.width * prepared.height; pixel++) {
    const source = pixel * 3;
    const encoded = encodeProPhotoPixel(
      adjustRawPixel(
        [
          prepared.data[source],
          prepared.data[source + 1],
          prepared.data[source + 2],
        ],
        settings,
      ),
      colorSpace,
    );
    const target = pixel * 6;
    view.setUint16(target, Math.round(clamp(encoded[0]) * 65535), true);
    view.setUint16(target + 2, Math.round(clamp(encoded[1]) * 65535), true);
    view.setUint16(target + 4, Math.round(clamp(encoded[2]) * 65535), true);
  }
  return { width: prepared.width, height: prepared.height, data };
}
import {
  correctRawLens,
  correctRawNoise,
  defaultRawLensCorrection,
  defaultRawNoiseCorrection,
  normalizeRawLensCorrection,
  normalizeRawNoiseCorrection,
  type RawLensCorrection,
  type RawNoiseCorrection,
} from './raw-corrections.ts';
