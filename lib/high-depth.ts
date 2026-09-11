import { applyCubeLut, type CubeLut } from './cube-lut.ts';

export type PrecisionPixels =
  | Uint8Array
  | Uint8ClampedArray
  | Uint16Array
  | Float32Array;

export type PrecisionImage = {
  width: number;
  height: number;
  data: PrecisionPixels;
};

export type PrecisionBlendMode = 'normal' | 'multiply' | 'screen' | 'overlay';

export type CurveChannel = 'rgb' | 'red' | 'green' | 'blue';
export type CurvePoint = { x: number; y: number };
export type ChannelLevel = {
  black: number;
  gamma: number;
  white: number;
  outputBlack: number;
  outputWhite: number;
};

export type PrecisionLayer = PrecisionImage & {
  opacity?: number;
  blend?: PrecisionBlendMode;
  visible?: boolean;
  mask?: PrecisionPixels;
};

export type HighDepthAdjustments = {
  brightness?: number;
  contrast?: number;
  hue?: number;
  saturation?: number;
  vibrance?: number;
  blackWhite?: boolean;
  redMix?: number;
  greenMix?: number;
  blueMix?: number;
  levelsBlack?: number;
  levelsWhite?: number;
  levelsGamma?: number;
  outputBlack?: number;
  outputWhite?: number;
  channelLevels?: Partial<Record<Exclude<CurveChannel, 'rgb'>, ChannelLevel>>;
  curveShadows?: number;
  curveHighlights?: number;
  redCurveShadows?: number;
  redCurveHighlights?: number;
  greenCurveShadows?: number;
  greenCurveHighlights?: number;
  blueCurveShadows?: number;
  blueCurveHighlights?: number;
  curves?: Partial<Record<CurveChannel, CurvePoint[]>>;
  exposure?: number;
  exposureGamma?: number;
  balanceCyanRed?: number;
  balanceMagentaGreen?: number;
  balanceYellowBlue?: number;
  photoFilter?: string;
  photoFilterDensity?: number;
  lut3d?: CubeLut;
  lutAmount?: number;
};

export const createDefaultHighDepthAdjustments = (): HighDepthAdjustments => ({
  brightness: 0,
  contrast: 0,
  exposure: 0,
  exposureGamma: 1,
  hue: 0,
  saturation: 0,
  vibrance: 0,
  levelsBlack: 0,
  levelsWhite: 255,
  levelsGamma: 1,
  outputBlack: 0,
  outputWhite: 255,
  channelLevels: {},
  curveShadows: 0,
  curveHighlights: 0,
  redCurveShadows: 0,
  redCurveHighlights: 0,
  greenCurveShadows: 0,
  greenCurveHighlights: 0,
  blueCurveShadows: 0,
  blueCurveHighlights: 0,
  curves: {},
  balanceCyanRed: 0,
  balanceMagentaGreen: 0,
  balanceYellowBlue: 0,
  blackWhite: false,
  redMix: 30,
  greenMix: 59,
  blueMix: 11,
  photoFilter: '#ec8a32',
  photoFilterDensity: 0,
  lutAmount: 100,
});

const clamp = (value: number, low = 0, high = 1) =>
  Math.max(low, Math.min(high, value));

/** Evaluate the two-zone editable tone curve used by adjustment layers. */
export const toneCurveValue = (input: number, shadows = 0, highlights = 0) => {
  const bounded = clamp(input);
  return (
    input +
    (shadows / 100) * (1 - bounded) * input +
    (highlights / 100) * bounded * (1 - bounded)
  );
};

export const sanitizeCurvePoints = (points: CurvePoint[] = []) => {
  const byInput = new Map<number, CurvePoint>();
  for (const point of points.slice(0, 14)) {
    const x = Math.round(clamp(Number(point.x)) * 10000) / 10000;
    const y = Math.round(clamp(Number(point.y)) * 10000) / 10000;
    if (Number.isFinite(x) && Number.isFinite(y)) byInput.set(x, { x, y });
  }
  if (!byInput.has(0)) byInput.set(0, { x: 0, y: 0 });
  if (!byInput.has(1)) byInput.set(1, { x: 1, y: 1 });
  return [...byInput.values()].sort((a, b) => a.x - b.x).slice(0, 16);
};

/** Evaluate an editable multi-point curve with a monotonic cubic spline. */
export const pointCurveValue = (input: number, points: CurvePoint[] = []) => {
  const bounded = clamp(input);
  const normalized = sanitizeCurvePoints(points);
  const widths = normalized
      .slice(1)
      .map((point, index) => point.x - normalized[index].x),
    slopes = normalized
      .slice(1)
      .map((point, index) => (point.y - normalized[index].y) / widths[index]),
    tangents = normalized.map((_, index) => {
      if (index === 0) return slopes[0];
      if (index === normalized.length - 1) return slopes.at(-1) ?? 0;
      return slopes[index - 1] * slopes[index] <= 0
        ? 0
        : (slopes[index - 1] + slopes[index]) / 2;
    });
  for (let index = 0; index < slopes.length; index++) {
    if (slopes[index] === 0) tangents[index] = tangents[index + 1] = 0;
    else {
      const a = tangents[index] / slopes[index],
        b = tangents[index + 1] / slopes[index],
        magnitude = Math.hypot(a, b);
      if (magnitude > 3) {
        const scale = 3 / magnitude;
        tangents[index] = scale * a * slopes[index];
        tangents[index + 1] = scale * b * slopes[index];
      }
    }
  }
  for (let index = 1; index < normalized.length; index++) {
    const right = normalized[index];
    if (bounded > right.x) continue;
    const left = normalized[index - 1],
      width = widths[index - 1],
      t = (bounded - left.x) / width,
      t2 = t * t,
      t3 = t2 * t,
      h00 = 2 * t3 - 3 * t2 + 1,
      h10 = t3 - 2 * t2 + t,
      h01 = -2 * t3 + 3 * t2,
      h11 = t3 - t2;
    return clamp(
      h00 * left.y +
        h10 * width * tangents[index - 1] +
        h01 * right.y +
        h11 * width * tangents[index],
    );
  }
  return normalized.at(-1)?.y ?? bounded;
};

export const levelCurveValue = (
  input: number,
  level: Partial<ChannelLevel> = {},
) => {
  const black = clamp((level.black ?? 0) / 255);
  const white = Math.max(black + 1 / 255, (level.white ?? 255) / 255);
  const gamma = Math.max(0.01, level.gamma ?? 1);
  const outputBlack = clamp((level.outputBlack ?? 0) / 255);
  const outputWhite = Math.max(outputBlack, (level.outputWhite ?? 255) / 255);
  const normalized = clamp((input - black) / (white - black)) ** (1 / gamma);
  return outputBlack + normalized * (outputWhite - outputBlack);
};

const maximumFor = (data: PrecisionPixels) =>
  data instanceof Float32Array ? 1 : data instanceof Uint16Array ? 65535 : 255;

const sample = (data: PrecisionPixels, index: number) =>
  data instanceof Float32Array ? data[index] : data[index] / maximumFor(data);

const blend = (backdrop: number, source: number, mode: PrecisionBlendMode) => {
  if (mode === 'multiply') return backdrop * source;
  if (mode === 'screen') return backdrop + source - backdrop * source;
  if (mode === 'overlay')
    return backdrop <= 0.5
      ? 2 * backdrop * source
      : 1 - 2 * (1 - backdrop) * (1 - source);
  return source;
};

const hueRotate = (
  red: number,
  green: number,
  blue: number,
  degrees: number,
) => {
  if (!degrees) return [red, green, blue] as const;
  const angle = (degrees * Math.PI) / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [
    (0.213 + cosine * 0.787 - sine * 0.213) * red +
      (0.715 - cosine * 0.715 - sine * 0.715) * green +
      (0.072 - cosine * 0.072 + sine * 0.928) * blue,
    (0.213 - cosine * 0.213 + sine * 0.143) * red +
      (0.715 + cosine * 0.285 + sine * 0.14) * green +
      (0.072 - cosine * 0.072 - sine * 0.283) * blue,
    (0.213 - cosine * 0.213 - sine * 0.787) * red +
      (0.715 - cosine * 0.715 + sine * 0.715) * green +
      (0.072 + cosine * 0.928 + sine * 0.072) * blue,
  ] as const;
};

const parseHexColor = (value = '#ec8a32') => {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) return [236 / 255, 138 / 255, 50 / 255] as const;
  return [0, 2, 4].map(
    (offset) => parseInt(match[1].slice(offset, offset + 2), 16) / 255,
  ) as [number, number, number];
};

/**
 * Apply a complete color correction recipe in one floating-point pass.
 * The input may be 8, 16 or 32-bit RGBA and the result stays Float32 until
 * the caller explicitly converts it for an 8-bit browser canvas.
 */
export function adjustHighDepth(
  image: PrecisionImage,
  settings: HighDepthAdjustments,
) {
  if (image.data.length !== image.width * image.height * 4)
    throw new Error(
      'High-depth pixel data length does not match its dimensions.',
    );
  const output = new Float32Array(image.data.length);
  const brightness = Math.max(0, 1 + (settings.brightness ?? 0) / 100);
  const contrast = Math.max(0, 1 + (settings.contrast ?? 0) / 100);
  const exposure = 2 ** (settings.exposure ?? 0);
  const exposureGamma = Math.max(0.01, settings.exposureGamma ?? 1);
  const saturation = Math.max(0, 1 + (settings.saturation ?? 0) / 100);
  const density = clamp((settings.photoFilterDensity ?? 0) / 100);
  const filter = parseHexColor(settings.photoFilter);

  for (let index = 0; index < image.data.length; index += 4) {
    let red = sample(image.data, index) * brightness;
    let green = sample(image.data, index + 1) * brightness;
    let blue = sample(image.data, index + 2) * brightness;

    const remap = (value: number) => {
      let normalized = levelCurveValue(value, {
        black: settings.levelsBlack,
        white: settings.levelsWhite,
        gamma: settings.levelsGamma,
        outputBlack: settings.outputBlack,
        outputWhite: settings.outputWhite,
      });
      normalized = toneCurveValue(
        normalized,
        settings.curveShadows,
        settings.curveHighlights,
      );
      normalized = pointCurveValue(normalized, settings.curves?.rgb);
      normalized = Math.max(0, normalized * exposure) ** (1 / exposureGamma);
      return (normalized - 0.5) * contrast + 0.5;
    };
    red = remap(red);
    green = remap(green);
    blue = remap(blue);
    red = toneCurveValue(
      red,
      settings.redCurveShadows,
      settings.redCurveHighlights,
    );
    green = toneCurveValue(
      green,
      settings.greenCurveShadows,
      settings.greenCurveHighlights,
    );
    blue = toneCurveValue(
      blue,
      settings.blueCurveShadows,
      settings.blueCurveHighlights,
    );
    red = pointCurveValue(
      levelCurveValue(red, settings.channelLevels?.red),
      settings.curves?.red,
    );
    green = pointCurveValue(
      levelCurveValue(green, settings.channelLevels?.green),
      settings.curves?.green,
    );
    blue = pointCurveValue(
      levelCurveValue(blue, settings.channelLevels?.blue),
      settings.curves?.blue,
    );

    red += ((settings.balanceCyanRed ?? 0) / 100) * 0.25;
    green += ((settings.balanceMagentaGreen ?? 0) / 100) * 0.25;
    blue += ((settings.balanceYellowBlue ?? 0) / 100) * 0.25;
    [red, green, blue] = hueRotate(red, green, blue, settings.hue ?? 0);

    if (density) {
      red = red * (1 - density) + filter[0] * density;
      green = green * (1 - density) + filter[1] * density;
      blue = blue * (1 - density) + filter[2] * density;
    }

    [red, green, blue] = applyCubeLut(
      red,
      green,
      blue,
      settings.lut3d,
      (settings.lutAmount ?? 100) / 100,
    );

    let luma = 0.299 * red + 0.587 * green + 0.114 * blue;
    const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
    const vibrance = 1 + ((settings.vibrance ?? 0) / 100) * (1 - clamp(chroma));
    const colorScale = Math.max(0, saturation * vibrance);
    red = luma + (red - luma) * colorScale;
    green = luma + (green - luma) * colorScale;
    blue = luma + (blue - luma) * colorScale;

    if (settings.blackWhite) {
      luma =
        red * ((settings.redMix ?? 30) / 100) +
        green * ((settings.greenMix ?? 59) / 100) +
        blue * ((settings.blueMix ?? 11) / 100);
      red = green = blue = luma;
    }
    output[index] = red;
    output[index + 1] = green;
    output[index + 2] = blue;
    output[index + 3] = sample(image.data, index + 3);
  }
  return output;
}

/** Quantize display-referred float pixels once, after all corrections. */
export function precisionToEncodedRgba(image: PrecisionImage) {
  if (image.data.length !== image.width * image.height * 4)
    throw new Error(
      'High-depth pixel data length does not match its dimensions.',
    );
  const result = new Uint8ClampedArray(image.data.length);
  for (let index = 0; index < image.data.length; index += 4) {
    result[index] = Math.round(clamp(sample(image.data, index)) * 255);
    result[index + 1] = Math.round(clamp(sample(image.data, index + 1)) * 255);
    result[index + 2] = Math.round(clamp(sample(image.data, index + 2)) * 255);
    result[index + 3] = Math.round(clamp(sample(image.data, index + 3)) * 255);
  }
  return result;
}

/**
 * Composite same-sized straight-alpha layers into a scene-linear float buffer.
 * RGB values above 1 remain available in normal mode for 32-bit HDR work.
 */
export function compositeHighDepth(
  width: number,
  height: number,
  layers: PrecisionLayer[],
) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1
  )
    throw new Error('High-depth composite dimensions are invalid.');
  const pixels = width * height;
  const output = new Float32Array(pixels * 4);
  for (const layer of layers) {
    if (layer.visible === false) continue;
    if (
      layer.width !== width ||
      layer.height !== height ||
      layer.data.length !== pixels * 4
    )
      throw new Error('High-depth layers must match the composite dimensions.');
    const opacity = clamp(layer.opacity ?? 1);
    const mode = layer.blend ?? 'normal';
    for (let pixel = 0; pixel < pixels; pixel++) {
      const index = pixel * 4;
      const mask = layer.mask ? clamp(sample(layer.mask, pixel)) : 1;
      const sourceAlpha = clamp(sample(layer.data, index + 3)) * opacity * mask;
      if (!sourceAlpha) continue;
      const backdropAlpha = output[index + 3];
      const outputAlpha = sourceAlpha + backdropAlpha * (1 - sourceAlpha);
      for (let channel = 0; channel < 3; channel++) {
        const source = sample(layer.data, index + channel);
        const backdrop = output[index + channel];
        const blended = blend(backdrop, source, mode);
        const premultiplied =
          (1 - sourceAlpha) * backdrop * backdropAlpha +
          (1 - backdropAlpha) * source * sourceAlpha +
          sourceAlpha * backdropAlpha * blended;
        output[index + channel] = outputAlpha ? premultiplied / outputAlpha : 0;
      }
      output[index + 3] = outputAlpha;
    }
  }
  return output;
}

const encodeSrgb = (value: number) => {
  const safe = clamp(value);
  return safe <= 0.0031308 ? safe * 12.92 : 1.055 * safe ** (1 / 2.4) - 0.055;
};

/** Convert 8/16/32-bit RGBA pixels to an 8-bit browser display preview. */
export function precisionToDisplayRgba(image: PrecisionImage) {
  if (image.data.length !== image.width * image.height * 4)
    throw new Error(
      'High-depth pixel data length does not match its dimensions.',
    );
  if (image.data instanceof Uint8ClampedArray)
    return new Uint8ClampedArray(image.data);
  const result = new Uint8ClampedArray(image.data.length);
  const floating = image.data instanceof Float32Array;
  for (let index = 0; index < image.data.length; index += 4) {
    for (let channel = 0; channel < 3; channel++) {
      let value = sample(image.data, index + channel);
      if (floating) {
        // Preserve normal-range values and smoothly compress HDR highlights.
        if (value > 1) value = value / (1 + Math.max(0, value - 1));
        value = encodeSrgb(value);
      }
      result[index + channel] = Math.round(clamp(value) * 255);
    }
    result[index + 3] = Math.round(clamp(sample(image.data, index + 3)) * 255);
  }
  return result;
}
