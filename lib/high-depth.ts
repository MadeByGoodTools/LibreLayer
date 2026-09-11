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
export type ChannelMixer = Record<
  'red' | 'green' | 'blue',
  { red: number; green: number; blue: number; constant: number }
>;
export type GradientMap = {
  shadows: string;
  highlights: string;
  amount: number;
  reverse?: boolean;
};
export type SelectiveColorTarget =
  | 'reds'
  | 'yellows'
  | 'greens'
  | 'cyans'
  | 'blues'
  | 'magentas'
  | 'whites'
  | 'neutrals'
  | 'blacks';
export type SelectiveColorRecipe = {
  cyan: number;
  magenta: number;
  yellow: number;
  black: number;
};
export type SelectiveColor = {
  mode: 'relative' | 'absolute';
  colors: Partial<Record<SelectiveColorTarget, SelectiveColorRecipe>>;
};
export type ShadowsHighlights = {
  shadows: number;
  highlights: number;
  shadowTone: number;
  highlightTone: number;
  color: number;
  midtone: number;
};
export type ReplaceColor = {
  target: string;
  fuzziness: number;
  hue: number;
  saturation: number;
  lightness: number;
  amount: number;
};
export type HueSaturationRangeTarget =
  | 'reds'
  | 'yellows'
  | 'greens'
  | 'cyans'
  | 'blues'
  | 'magentas';
export type HueSaturationRange = {
  hue: number;
  saturation: number;
  lightness: number;
};
export type ColorStatistics = {
  mean: [number, number, number];
  deviation: [number, number, number];
};
export type MatchColor = {
  sourceName: string;
  source: ColorStatistics;
  target: ColorStatistics;
  amount: number;
  luminance: number;
  colorIntensity: number;
  neutralize: boolean;
};
export type HdrToning = {
  method: 'reinhard' | 'filmic';
  strength: number;
  exposure: number;
  gamma: number;
  shadows: number;
  highlights: number;
};
export type PerceptualVibrance = {
  amount: number;
  protectSkin: number;
};
export type GradeWheel = { color: string; level: number };
export type LiftGammaGain = {
  lift: GradeWheel;
  gamma: GradeWheel;
  gain: GradeWheel;
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
  channelMixer?: ChannelMixer;
  gradientMap?: GradientMap;
  selectiveColor?: SelectiveColor;
  shadowsHighlights?: ShadowsHighlights;
  replaceColor?: ReplaceColor;
  hueSaturationRanges?: Partial<
    Record<HueSaturationRangeTarget, HueSaturationRange>
  >;
  matchColor?: MatchColor;
  hdrToning?: HdrToning;
  perceptualVibrance?: PerceptualVibrance;
  liftGammaGain?: LiftGammaGain;
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
  channelMixer: {
    red: { red: 100, green: 0, blue: 0, constant: 0 },
    green: { red: 0, green: 100, blue: 0, constant: 0 },
    blue: { red: 0, green: 0, blue: 100, constant: 0 },
  },
  gradientMap: {
    shadows: '#000000',
    highlights: '#ffffff',
    amount: 0,
  },
  selectiveColor: { mode: 'relative', colors: {} },
  shadowsHighlights: {
    shadows: 0,
    highlights: 0,
    shadowTone: 50,
    highlightTone: 50,
    color: 0,
    midtone: 0,
  },
  replaceColor: {
    target: '#ff0000',
    fuzziness: 40,
    hue: 0,
    saturation: 0,
    lightness: 0,
    amount: 0,
  },
  hueSaturationRanges: {},
  hdrToning: {
    method: 'reinhard',
    strength: 0,
    exposure: 0,
    gamma: 1,
    shadows: 0,
    highlights: 0,
  },
  perceptualVibrance: { amount: 0, protectSkin: 60 },
  liftGammaGain: {
    lift: { color: '#808080', level: 0 },
    gamma: { color: '#808080', level: 0 },
    gain: { color: '#808080', level: 0 },
  },
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

/** Reduce a freehand stroke to a stable editable curve without losing its overall shape. */
export const resampleCurvePoints = (
  points: CurvePoint[] = [],
  maximum = 14,
) => {
  const byInput = new Map<number, CurvePoint>();
  for (const point of points) {
    const x = Math.round(clamp(Number(point.x)) * 10000) / 10000;
    const y = Math.round(clamp(Number(point.y)) * 10000) / 10000;
    if (Number.isFinite(x) && Number.isFinite(y)) byInput.set(x, { x, y });
  }
  const sorted = [...byInput.values()].sort((a, b) => a.x - b.x);
  const limit = Math.max(2, Math.min(14, Math.round(maximum)));
  if (sorted.length <= limit) return sorted;
  const result: CurvePoint[] = [];
  for (let index = 0; index < limit; index++) {
    const target = index / (limit - 1);
    const sourceIndex = target * (sorted.length - 1);
    const left = Math.floor(sourceIndex);
    const right = Math.min(sorted.length - 1, Math.ceil(sourceIndex));
    const mix = sourceIndex - left;
    result.push({
      x: sorted[left].x + (sorted[right].x - sorted[left].x) * mix,
      y: sorted[left].y + (sorted[right].y - sorted[left].y) * mix,
    });
  }
  return result;
};

/** Smooth editable curve points while retaining their input positions and endpoints. */
export const smoothCurvePoints = (points: CurvePoint[] = [], strength = 50) => {
  const sorted = resampleCurvePoints(points);
  const amount = clamp(strength / 100);
  return sorted.map((point, index) => {
    if (index === 0 || index === sorted.length - 1) return { ...point };
    const average =
      (sorted[index - 1].y + point.y * 2 + sorted[index + 1].y) / 4;
    return { ...point, y: point.y + (average - point.y) * amount };
  });
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

const selectiveColorWeights = (red: number, green: number, blue: number) => {
  const maximum = Math.max(red, green, blue),
    minimum = Math.min(red, green, blue),
    chroma = maximum - minimum,
    hue =
      chroma <= 1e-6
        ? 0
        : maximum === red
          ? ((green - blue) / chroma + (green < blue ? 6 : 0)) / 6
          : maximum === green
            ? ((blue - red) / chroma + 2) / 6
            : ((red - green) / chroma + 4) / 6,
    sector = (center: number) => {
      const distance = Math.min(
        Math.abs(hue - center),
        1 - Math.abs(hue - center),
      );
      return clamp(1 - distance * 6) * clamp(chroma * 3);
    },
    lightness = (maximum + minimum) / 2;
  return {
    reds: sector(0),
    yellows: sector(1 / 6),
    greens: sector(2 / 6),
    cyans: sector(3 / 6),
    blues: sector(4 / 6),
    magentas: sector(5 / 6),
    whites: clamp((lightness - 0.55) / 0.45) * (1 - chroma * 0.35),
    neutrals: clamp(1 - Math.abs(lightness - 0.5) / 0.35) * (1 - chroma * 0.2),
    blacks: clamp((0.45 - lightness) / 0.45) * (1 - chroma * 0.35),
  } satisfies Record<SelectiveColorTarget, number>;
};

export const applySelectiveColor = (
  red: number,
  green: number,
  blue: number,
  adjustment?: SelectiveColor,
) => {
  if (!adjustment) return [red, green, blue] as const;
  const weights = selectiveColorWeights(red, green, blue),
    channels = [red, green, blue],
    adjust = (channel: number, amount: number) =>
      adjustment.mode === 'absolute'
        ? -amount / 100
        : amount >= 0
          ? -channel * (amount / 100)
          : (1 - channel) * (-amount / 100);
  for (const [target, recipe] of Object.entries(adjustment.colors) as [
    SelectiveColorTarget,
    SelectiveColorRecipe,
  ][]) {
    const weight = weights[target];
    if (!recipe || weight <= 0) continue;
    channels[0] += adjust(channels[0], recipe.cyan) * weight;
    channels[1] += adjust(channels[1], recipe.magenta) * weight;
    channels[2] += adjust(channels[2], recipe.yellow) * weight;
    const black = recipe.black / 100;
    for (let channel = 0; channel < 3; channel++)
      channels[channel] +=
        (black >= 0
          ? -channels[channel] * black
          : (1 - channels[channel]) * -black) * weight;
  }
  return channels.map((value) => clamp(value)) as [number, number, number];
};

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const position = clamp((value - edge0) / Math.max(1e-6, edge1 - edge0));
  return position * position * (3 - 2 * position);
};

export const applyShadowsHighlights = (
  red: number,
  green: number,
  blue: number,
  adjustment?: ShadowsHighlights,
) => {
  if (!adjustment || (!adjustment.shadows && !adjustment.highlights))
    return [red, green, blue] as const;
  const luma = clamp(0.299 * red + 0.587 * green + 0.114 * blue),
    shadowEdge = clamp(adjustment.shadowTone / 100, 0.05, 0.95),
    highlightEdge = clamp(1 - adjustment.highlightTone / 100, 0.05, 0.95),
    shadowMask = 1 - smoothstep(0, shadowEdge, luma),
    highlightMask = smoothstep(highlightEdge, 1, luma),
    shadowStrength = (adjustment.shadows / 100) * shadowMask,
    highlightStrength = (adjustment.highlights / 100) * highlightMask,
    corrected = [red, green, blue].map(
      (channel) =>
        channel +
        (1 - channel) * shadowStrength * 0.8 -
        channel * highlightStrength * 0.8,
    ),
    correctedLuma =
      0.299 * corrected[0] + 0.587 * corrected[1] + 0.114 * corrected[2],
    affected = clamp(shadowMask + highlightMask),
    colorScale = Math.max(0, 1 + (adjustment.color / 100) * affected),
    midtoneScale = 1 + (adjustment.midtone / 100) * (1 - affected) * 0.75;
  return corrected.map((channel) =>
    clamp(
      (correctedLuma + (channel - correctedLuma) * colorScale - 0.5) *
        midtoneScale +
        0.5,
    ),
  ) as [number, number, number];
};

export const applyReplaceColor = (
  red: number,
  green: number,
  blue: number,
  adjustment?: ReplaceColor,
) => {
  if (!adjustment || adjustment.amount <= 0) return [red, green, blue] as const;
  const target = parseHexColor(adjustment.target),
    distance = Math.hypot(red - target[0], green - target[1], blue - target[2]),
    tolerance = 0.025 + (adjustment.fuzziness / 100) * 0.75,
    mask = 1 - smoothstep(tolerance * 0.55, tolerance, distance);
  if (mask <= 0) return [red, green, blue] as const;
  let [nextRed, nextGreen, nextBlue] = hueRotate(
    red,
    green,
    blue,
    adjustment.hue,
  );
  const luma = 0.299 * nextRed + 0.587 * nextGreen + 0.114 * nextBlue,
    saturation = Math.max(0, 1 + adjustment.saturation / 100),
    lightness = adjustment.lightness / 100;
  nextRed = luma + (nextRed - luma) * saturation + lightness;
  nextGreen = luma + (nextGreen - luma) * saturation + lightness;
  nextBlue = luma + (nextBlue - luma) * saturation + lightness;
  const strength = mask * clamp(adjustment.amount / 100);
  return [
    clamp(red + (nextRed - red) * strength),
    clamp(green + (nextGreen - green) * strength),
    clamp(blue + (nextBlue - blue) * strength),
  ] as const;
};

export const applyHueSaturationRanges = (
  red: number,
  green: number,
  blue: number,
  ranges?: Partial<Record<HueSaturationRangeTarget, HueSaturationRange>>,
) => {
  if (!ranges) return [red, green, blue] as const;
  const weights = selectiveColorWeights(red, green, blue);
  let channels = [red, green, blue] as [number, number, number];
  for (const target of [
    'reds',
    'yellows',
    'greens',
    'cyans',
    'blues',
    'magentas',
  ] as const) {
    const recipe = ranges[target],
      weight = weights[target];
    if (!recipe || weight <= 0) continue;
    let shifted = hueRotate(...channels, recipe.hue);
    const luma = 0.299 * shifted[0] + 0.587 * shifted[1] + 0.114 * shifted[2],
      saturation = Math.max(0, 1 + recipe.saturation / 100),
      lightness = recipe.lightness / 100;
    shifted = shifted.map(
      (channel) => luma + (channel - luma) * saturation + lightness,
    ) as [number, number, number];
    channels = channels.map((channel, index) =>
      clamp(channel + (shifted[index] - channel) * weight),
    ) as [number, number, number];
  }
  return channels;
};

export const computeColorStatistics = (image: PrecisionImage) => {
  if (image.data.length !== image.width * image.height * 4)
    throw new Error('Color statistics require complete RGBA pixels.');
  const mean = [0, 0, 0],
    deviation = [0, 0, 0];
  let weight = 0;
  for (let index = 0; index < image.data.length; index += 4) {
    const alpha = sample(image.data, index + 3);
    if (alpha <= 0) continue;
    weight += alpha;
    for (let channel = 0; channel < 3; channel++)
      mean[channel] += sample(image.data, index + channel) * alpha;
  }
  if (!weight)
    return {
      mean: [0, 0, 0],
      deviation: [0, 0, 0],
    } satisfies ColorStatistics;
  for (let channel = 0; channel < 3; channel++) mean[channel] /= weight;
  for (let index = 0; index < image.data.length; index += 4) {
    const alpha = sample(image.data, index + 3);
    if (alpha <= 0) continue;
    for (let channel = 0; channel < 3; channel++) {
      const difference = sample(image.data, index + channel) - mean[channel];
      deviation[channel] += difference * difference * alpha;
    }
  }
  return {
    mean: mean as [number, number, number],
    deviation: deviation.map((value) => Math.sqrt(value / weight)) as [
      number,
      number,
      number,
    ],
  } satisfies ColorStatistics;
};

export const applyMatchColor = (
  red: number,
  green: number,
  blue: number,
  adjustment?: MatchColor,
) => {
  if (!adjustment || adjustment.amount <= 0) return [red, green, blue] as const;
  const channels = [red, green, blue],
    matched = channels.map((value, channel) => {
      const targetDeviation = Math.max(
          1 / 255,
          adjustment.target.deviation[channel],
        ),
        standardized =
          (value - adjustment.target.mean[channel]) / targetDeviation;
      return (
        adjustment.source.mean[channel] +
        standardized * adjustment.source.deviation[channel]
      );
    }),
    sourceLuma = matched[0] * 0.299 + matched[1] * 0.587 + matched[2] * 0.114,
    originalLuma = red * 0.299 + green * 0.587 + blue * 0.114,
    luminance = adjustment.luminance / 100,
    intensity = adjustment.colorIntensity / 100;
  for (let channel = 0; channel < 3; channel++)
    matched[channel] =
      originalLuma +
      (sourceLuma - originalLuma) * luminance +
      (matched[channel] - sourceLuma) * intensity;
  if (adjustment.neutralize) {
    const tint =
      (adjustment.source.mean[0] +
        adjustment.source.mean[1] +
        adjustment.source.mean[2]) /
      3;
    for (let channel = 0; channel < 3; channel++)
      matched[channel] -= (adjustment.source.mean[channel] - tint) * 0.5;
  }
  const amount = clamp(adjustment.amount / 100);
  return channels.map((value, channel) =>
    clamp(value + (matched[channel] - value) * amount),
  ) as [number, number, number];
};

export const applyHdrToning = (
  red: number,
  green: number,
  blue: number,
  adjustment?: HdrToning,
) => {
  if (!adjustment || adjustment.strength <= 0)
    return [red, green, blue] as const;
  const exposure = 2 ** adjustment.exposure,
    gamma = Math.max(0.1, adjustment.gamma),
    amount = clamp(adjustment.strength / 100),
    tone = (value: number) => {
      const exposed = Math.max(0, value * exposure),
        compressed =
          adjustment.method === 'filmic'
            ? (exposed * (2.51 * exposed + 0.03)) /
              (exposed * (2.43 * exposed + 0.59) + 0.14)
            : exposed / (1 + exposed),
        gammaCorrected = Math.max(0, compressed) ** (1 / gamma),
        shadowMask = 1 - smoothstep(0, 0.5, value),
        highlightMask = smoothstep(0.5, 1, value);
      return clamp(
        gammaCorrected +
          (adjustment.shadows / 100) * shadowMask * 0.25 +
          (adjustment.highlights / 100) * highlightMask * 0.25,
      );
    };
  return [red, green, blue].map(
    (value) => value + (tone(value) - value) * amount,
  ) as [number, number, number];
};

export const applyLiftGammaGain = (
  red: number,
  green: number,
  blue: number,
  adjustment?: LiftGammaGain,
) => {
  if (!adjustment) return [red, green, blue] as const;
  let channels = [red, green, blue];
  const tint = (wheel: GradeWheel) => {
    const color = parseHexColor(wheel.color),
      luma = color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114;
    return color.map((value) => (value - luma) * 0.35);
  };
  const liftTint = tint(adjustment.lift),
    gammaTint = tint(adjustment.gamma),
    gainTint = tint(adjustment.gain),
    lift = adjustment.lift.level / 100,
    gamma = 2 ** (adjustment.gamma.level / 100),
    gain = 2 ** (adjustment.gain.level / 100);
  channels = channels.map((value, channel) =>
    clamp(value + lift + liftTint[channel]),
  );
  channels = channels.map((value, channel) =>
    clamp(value ** (1 / Math.max(0.1, gamma + gammaTint[channel]))),
  );
  channels = channels.map((value, channel) =>
    clamp(value * Math.max(0, gain + gainTint[channel])),
  );
  return channels as [number, number, number];
};

export const applyPerceptualVibrance = (
  red: number,
  green: number,
  blue: number,
  adjustment?: PerceptualVibrance,
) => {
  if (!adjustment || adjustment.amount === 0)
    return [red, green, blue] as const;
  const maximum = Math.max(red, green, blue),
    minimum = Math.min(red, green, blue),
    chroma = maximum - minimum,
    luma = 0.299 * red + 0.587 * green + 0.114 * blue,
    redDominance = clamp((red - Math.max(green, blue)) * 4),
    skinLuma =
      smoothstep(0.15, 0.45, luma) * (1 - smoothstep(0.75, 0.95, luma)),
    skinProtection =
      1 - redDominance * skinLuma * clamp(adjustment.protectSkin / 100),
    scale = Math.max(
      0,
      1 +
        (adjustment.amount / 100) *
          (adjustment.amount > 0 ? 1 - chroma : 1) *
          skinProtection,
    );
  return [red, green, blue].map((value) =>
    clamp(luma + (value - luma) * scale),
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
  const mixer = settings.channelMixer;
  const mixerActive =
    !!mixer &&
    (mixer.red.red !== 100 ||
      mixer.red.green !== 0 ||
      mixer.red.blue !== 0 ||
      mixer.red.constant !== 0 ||
      mixer.green.red !== 0 ||
      mixer.green.green !== 100 ||
      mixer.green.blue !== 0 ||
      mixer.green.constant !== 0 ||
      mixer.blue.red !== 0 ||
      mixer.blue.green !== 0 ||
      mixer.blue.blue !== 100 ||
      mixer.blue.constant !== 0);
  const selective = settings.selectiveColor;
  const selectiveActive =
    !!selective &&
    Object.values(selective.colors).some(
      (recipe) =>
        !!recipe &&
        (recipe.cyan !== 0 ||
          recipe.magenta !== 0 ||
          recipe.yellow !== 0 ||
          recipe.black !== 0),
    );
  const shadowsHighlights = settings.shadowsHighlights,
    shadowsHighlightsActive =
      !!shadowsHighlights &&
      (shadowsHighlights.shadows !== 0 || shadowsHighlights.highlights !== 0),
    replaceColor = settings.replaceColor,
    replaceColorActive = !!replaceColor && replaceColor.amount > 0,
    hueSaturationRanges = settings.hueSaturationRanges,
    hueSaturationRangesActive =
      !!hueSaturationRanges &&
      Object.values(hueSaturationRanges).some(
        (recipe) =>
          !!recipe &&
          (recipe.hue !== 0 ||
            recipe.saturation !== 0 ||
            recipe.lightness !== 0),
      ),
    matchColor = settings.matchColor,
    matchColorActive = !!matchColor && matchColor.amount > 0,
    hdrToning = settings.hdrToning,
    hdrToningActive = !!hdrToning && hdrToning.strength > 0,
    perceptualVibrance = settings.perceptualVibrance,
    perceptualVibranceActive =
      !!perceptualVibrance && perceptualVibrance.amount !== 0,
    liftGammaGain = settings.liftGammaGain,
    liftGammaGainActive =
      !!liftGammaGain &&
      (liftGammaGain.lift.level !== 0 ||
        liftGammaGain.lift.color !== '#808080' ||
        liftGammaGain.gamma.level !== 0 ||
        liftGammaGain.gamma.color !== '#808080' ||
        liftGammaGain.gain.level !== 0 ||
        liftGammaGain.gain.color !== '#808080');
  const masterLevelsActive =
    (settings.levelsBlack ?? 0) !== 0 ||
    (settings.levelsWhite ?? 255) !== 255 ||
    (settings.levelsGamma ?? 1) !== 1 ||
    (settings.outputBlack ?? 0) !== 0 ||
    (settings.outputWhite ?? 255) !== 255;
  const masterToneActive =
    (settings.curveShadows ?? 0) !== 0 || (settings.curveHighlights ?? 0) !== 0;
  const masterPoints = settings.curves?.rgb;
  const masterPointsActive = !!masterPoints?.length;
  const channelActive = (channel: Exclude<CurveChannel, 'rgb'>) =>
    !!settings.channelLevels?.[channel] ||
    (settings[`${channel}CurveShadows`] ?? 0) !== 0 ||
    (settings[`${channel}CurveHighlights`] ?? 0) !== 0 ||
    !!settings.curves?.[channel]?.length;
  const redChannelActive = channelActive('red'),
    greenChannelActive = channelActive('green'),
    blueChannelActive = channelActive('blue');

  for (let index = 0; index < image.data.length; index += 4) {
    let red = sample(image.data, index) * brightness;
    let green = sample(image.data, index + 1) * brightness;
    let blue = sample(image.data, index + 2) * brightness;

    const remap = (value: number) => {
      let normalized = value;
      if (masterLevelsActive)
        normalized = levelCurveValue(normalized, {
          black: settings.levelsBlack,
          white: settings.levelsWhite,
          gamma: settings.levelsGamma,
          outputBlack: settings.outputBlack,
          outputWhite: settings.outputWhite,
        });
      if (masterToneActive)
        normalized = toneCurveValue(
          normalized,
          settings.curveShadows,
          settings.curveHighlights,
        );
      if (masterPointsActive)
        normalized = pointCurveValue(normalized, masterPoints);
      if (exposure !== 1 || exposureGamma !== 1)
        normalized = Math.max(0, normalized * exposure) ** (1 / exposureGamma);
      return contrast === 1 ? normalized : (normalized - 0.5) * contrast + 0.5;
    };
    red = remap(red);
    green = remap(green);
    blue = remap(blue);
    const remapChannel = (
      value: number,
      channel: Exclude<CurveChannel, 'rgb'>,
    ) => {
      let result = levelCurveValue(value, settings.channelLevels?.[channel]);
      result = toneCurveValue(
        result,
        settings[`${channel}CurveShadows`],
        settings[`${channel}CurveHighlights`],
      );
      return settings.curves?.[channel]?.length
        ? pointCurveValue(result, settings.curves[channel])
        : result;
    };
    if (redChannelActive) red = remapChannel(red, 'red');
    if (greenChannelActive) green = remapChannel(green, 'green');
    if (blueChannelActive) blue = remapChannel(blue, 'blue');

    if (mixerActive && mixer) {
      const source = [red, green, blue] as const,
        mix = (recipe: ChannelMixer['red']) =>
          source[0] * (recipe.red / 100) +
          source[1] * (recipe.green / 100) +
          source[2] * (recipe.blue / 100) +
          recipe.constant / 100;
      red = mix(mixer.red);
      green = mix(mixer.green);
      blue = mix(mixer.blue);
    }

    red += ((settings.balanceCyanRed ?? 0) / 100) * 0.25;
    green += ((settings.balanceMagentaGreen ?? 0) / 100) * 0.25;
    blue += ((settings.balanceYellowBlue ?? 0) / 100) * 0.25;
    [red, green, blue] = hueRotate(red, green, blue, settings.hue ?? 0);
    if (hueSaturationRangesActive)
      [red, green, blue] = applyHueSaturationRanges(
        red,
        green,
        blue,
        hueSaturationRanges,
      );

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

    if ((settings.gradientMap?.amount ?? 0) > 0) {
      const map = settings.gradientMap!,
        shadow = parseHexColor(map.shadows),
        highlight = parseHexColor(map.highlights),
        sourceLuma = clamp(0.2126 * red + 0.7152 * green + 0.0722 * blue),
        position = map.reverse ? 1 - sourceLuma : sourceLuma,
        amount = clamp(map.amount / 100),
        mapped = shadow.map(
          (value, channel) => value + (highlight[channel] - value) * position,
        );
      red += (mapped[0] - red) * amount;
      green += (mapped[1] - green) * amount;
      blue += (mapped[2] - blue) * amount;
    }

    if (selectiveActive)
      [red, green, blue] = applySelectiveColor(red, green, blue, selective);

    if (shadowsHighlightsActive)
      [red, green, blue] = applyShadowsHighlights(
        red,
        green,
        blue,
        shadowsHighlights,
      );

    if (replaceColorActive)
      [red, green, blue] = applyReplaceColor(red, green, blue, replaceColor);

    if (matchColorActive)
      [red, green, blue] = applyMatchColor(red, green, blue, matchColor);

    if (liftGammaGainActive)
      [red, green, blue] = applyLiftGammaGain(red, green, blue, liftGammaGain);

    if (hdrToningActive)
      [red, green, blue] = applyHdrToning(red, green, blue, hdrToning);

    if (perceptualVibranceActive)
      [red, green, blue] = applyPerceptualVibrance(
        red,
        green,
        blue,
        perceptualVibrance,
      );

    let luma = 0.299 * red + 0.587 * green + 0.114 * blue;
    const vibranceAmount = (settings.vibrance ?? 0) / 100;
    if (saturation !== 1 || vibranceAmount !== 0) {
      const chroma = Math.max(red, green, blue) - Math.min(red, green, blue),
        vibrance = 1 + vibranceAmount * (1 - clamp(chroma)),
        colorScale = Math.max(0, saturation * vibrance);
      red = luma + (red - luma) * colorScale;
      green = luma + (green - luma) * colorScale;
      blue = luma + (blue - luma) * colorScale;
    }

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
