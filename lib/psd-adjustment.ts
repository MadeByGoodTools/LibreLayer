import type {
  AdjustmentLayer,
  BrightnessAdjustment,
  Color,
  CurvesAdjustmentChannel,
  HueSaturationAdjustmentChannel,
  LevelsAdjustmentChannel,
} from 'ag-psd';
import {
  createDefaultHighDepthAdjustments,
  type ChannelLevel,
  type CurveChannel,
  type HighDepthAdjustments,
  type SelectiveColorTarget,
} from './high-depth.ts';

const defaults = createDefaultHighDepthAdjustments();
const keys = <T extends keyof HighDepthAdjustments>(...values: T[]) => values;
const resolved = (input: HighDepthAdjustments | undefined) => ({
  ...defaults,
  ...input,
});

function hasOnly(
  input: HighDepthAdjustments | undefined,
  allowed: (keyof HighDepthAdjustments)[],
) {
  const value = resolved(input),
    comparison = { ...defaults };
  for (const key of allowed)
    (comparison as Record<string, unknown>)[key] = value[key];
  return JSON.stringify(value) === JSON.stringify(comparison);
}

function isActive(
  input: HighDepthAdjustments | undefined,
  family: (keyof HighDepthAdjustments)[],
) {
  const value = resolved(input);
  return family.some(
    (key) => JSON.stringify(value[key]) !== JSON.stringify(defaults[key]),
  );
}

const clampByte = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)));
const hexToRgb = (value: string) => {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value);
  return match
    ? {
        r: parseInt(match[1], 16),
        g: parseInt(match[2], 16),
        b: parseInt(match[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};
const colorToHex = (color: Color | undefined) => {
  if (!color) return '#000000';
  const channels =
    'r' in color
      ? [color.r, color.g, color.b]
      : 'fr' in color
        ? [color.fr * 255, color.fg * 255, color.fb * 255]
        : [0, 0, 0];
  return `#${channels
    .map((value) => clampByte(value).toString(16).padStart(2, '0'))
    .join('')}`;
};

const levelToPsd = (value: ChannelLevel): LevelsAdjustmentChannel => ({
  shadowInput: value.black,
  highlightInput: value.white,
  shadowOutput: value.outputBlack,
  highlightOutput: value.outputWhite,
  midtoneInput: value.gamma,
});
const levelFromPsd = (value: LevelsAdjustmentChannel): ChannelLevel => ({
  black: value.shadowInput,
  white: value.highlightInput,
  outputBlack: value.shadowOutput,
  outputWhite: value.highlightOutput,
  gamma: value.midtoneInput,
});
const curveToPsd = (
  value: { x: number; y: number }[],
): CurvesAdjustmentChannel =>
  value.map((point) => ({
    input: Math.round(point.x * 255),
    output: Math.round(point.y * 255),
  }));
const curveFromPsd = (value: CurvesAdjustmentChannel) =>
  value.map((point) => ({ x: point.input / 255, y: point.output / 255 }));
const hueChannel = (
  hue: number,
  saturation: number,
): HueSaturationAdjustmentChannel => ({
  a: 0,
  b: 0,
  c: 0,
  d: 0,
  hue,
  saturation,
  lightness: 0,
});

const hasNonZeroBalance = (
  value:
    | { cyanRed: number; magentaGreen: number; yellowBlue: number }
    | undefined,
) =>
  Boolean(value && (value.cyanRed || value.magentaGreen || value.yellowBlue));

const hasNonZeroMixerChannel = (
  value:
    | { red: number; green: number; blue: number; constant: number }
    | undefined,
) =>
  Boolean(value && (value.red || value.green || value.blue || value.constant));

export function psdBrightnessToHighDepth(
  adjustment: BrightnessAdjustment,
): HighDepthAdjustments {
  return {
    ...createDefaultHighDepthAdjustments(),
    brightness: adjustment.brightness ?? 0,
    contrast: adjustment.contrast ?? 0,
  };
}

export function psdAdjustmentToHighDepth(
  adjustment: AdjustmentLayer,
): HighDepthAdjustments | undefined {
  const base = createDefaultHighDepthAdjustments();
  if (adjustment.type === 'brightness/contrast') {
    if (adjustment.useLegacy || adjustment.labColorOnly || adjustment.auto)
      return undefined;
    return psdBrightnessToHighDepth(adjustment);
  }
  if (adjustment.type === 'exposure') {
    if ((adjustment.offset ?? 0) !== 0) return undefined;
    return {
      ...base,
      exposure: adjustment.exposure ?? 0,
      exposureGamma: adjustment.gamma ?? 1,
    };
  }
  if (adjustment.type === 'vibrance')
    return {
      ...base,
      vibrance: adjustment.vibrance ?? 0,
      saturation: adjustment.saturation ?? 0,
    };
  if (adjustment.type === 'hue/saturation') {
    if (
      adjustment.reds ||
      adjustment.yellows ||
      adjustment.greens ||
      adjustment.cyans ||
      adjustment.blues ||
      adjustment.magentas
    )
      return undefined;
    return {
      ...base,
      hue: adjustment.master?.hue ?? 0,
      saturation: adjustment.master?.saturation ?? 0,
    };
  }
  if (adjustment.type === 'color balance') {
    if (
      hasNonZeroBalance(adjustment.shadows) ||
      hasNonZeroBalance(adjustment.highlights)
    )
      return undefined;
    const value = adjustment.midtones ?? {
      cyanRed: 0,
      magentaGreen: 0,
      yellowBlue: 0,
    };
    return {
      ...base,
      balanceCyanRed: value.cyanRed,
      balanceMagentaGreen: value.magentaGreen,
      balanceYellowBlue: value.yellowBlue,
    };
  }
  if (adjustment.type === 'black & white') {
    if (
      (adjustment.yellows ?? 0) !== 0 ||
      (adjustment.cyans ?? 0) !== 0 ||
      (adjustment.magentas ?? 0) !== 0 ||
      adjustment.useTint
    )
      return undefined;
    return {
      ...base,
      blackWhite: true,
      redMix: adjustment.reds ?? 30,
      greenMix: adjustment.greens ?? 59,
      blueMix: adjustment.blues ?? 11,
    };
  }
  if (adjustment.type === 'photo filter') {
    if (adjustment.preserveLuminosity === false) return undefined;
    return {
      ...base,
      photoFilter: colorToHex(adjustment.color),
      photoFilterDensity: adjustment.density ?? 0,
    };
  }
  if (adjustment.type === 'levels') {
    const rgb = adjustment.rgb;
    return {
      ...base,
      levelsBlack: rgb?.shadowInput ?? 0,
      levelsWhite: rgb?.highlightInput ?? 255,
      levelsGamma: rgb?.midtoneInput ?? 1,
      outputBlack: rgb?.shadowOutput ?? 0,
      outputWhite: rgb?.highlightOutput ?? 255,
      channelLevels: Object.fromEntries(
        (['red', 'green', 'blue'] as const)
          .filter((channel) => adjustment[channel])
          .map((channel) => [channel, levelFromPsd(adjustment[channel]!)]),
      ),
    };
  }
  if (adjustment.type === 'curves')
    return {
      ...base,
      curves: Object.fromEntries(
        (['rgb', 'red', 'green', 'blue'] as CurveChannel[])
          .filter((channel) => adjustment[channel])
          .map((channel) => [channel, curveFromPsd(adjustment[channel]!)]),
      ),
    };
  if (adjustment.type === 'channel mixer') {
    if (adjustment.monochrome || hasNonZeroMixerChannel(adjustment.gray))
      return undefined;
    return {
      ...base,
      channelMixer: {
        red: adjustment.red ?? base.channelMixer!.red,
        green: adjustment.green ?? base.channelMixer!.green,
        blue: adjustment.blue ?? base.channelMixer!.blue,
      },
    };
  }
  if (
    adjustment.type === 'gradient map' &&
    adjustment.gradientType === 'solid' &&
    adjustment.colorStops?.length === 2 &&
    !adjustment.dither &&
    !adjustment.opacityStops?.some((stop) => stop.opacity !== 1)
  ) {
    const first = adjustment.colorStops?.[0]?.color,
      last = adjustment.colorStops?.at(-1)?.color;
    return {
      ...base,
      gradientMap: {
        shadows: colorToHex(first),
        highlights: colorToHex(last),
        amount: 100,
        reverse: adjustment.reverse,
      },
    };
  }
  if (adjustment.type === 'selective color') {
    const targets: SelectiveColorTarget[] = [
      'reds',
      'yellows',
      'greens',
      'cyans',
      'blues',
      'magentas',
      'whites',
      'neutrals',
      'blacks',
    ];
    return {
      ...base,
      selectiveColor: {
        mode: adjustment.mode ?? 'relative',
        colors: Object.fromEntries(
          targets
            .filter((target) => adjustment[target])
            .map((target) => {
              const color = adjustment[target]!;
              return [
                target,
                {
                  cyan: color.c,
                  magenta: color.m,
                  yellow: color.y,
                  black: color.k,
                },
              ];
            }),
        ),
      },
    };
  }
  return undefined;
}

const families = {
  brightness: keys('brightness', 'contrast'),
  exposure: keys('exposure', 'exposureGamma'),
  vibrance: keys('vibrance', 'saturation'),
  hue: keys('hue', 'saturation', 'hueSaturationRanges'),
  balance: keys('balanceCyanRed', 'balanceMagentaGreen', 'balanceYellowBlue'),
  blackWhite: keys('blackWhite', 'redMix', 'greenMix', 'blueMix'),
  photo: keys('photoFilter', 'photoFilterDensity'),
  levels: keys(
    'levelsBlack',
    'levelsWhite',
    'levelsGamma',
    'outputBlack',
    'outputWhite',
    'channelLevels',
  ),
  curves: keys('curves'),
  mixer: keys('channelMixer'),
  gradient: keys('gradientMap'),
  selective: keys('selectiveColor'),
};

export function highDepthToPsdAdjustment(
  input: HighDepthAdjustments | undefined,
): AdjustmentLayer | undefined {
  const value = resolved(input);
  if (!Object.values(families).some((family) => isActive(input, family)))
    return {
      type: 'brightness/contrast',
      brightness: 0,
      contrast: 0,
      useLegacy: false,
    };
  if (hasOnly(input, families.brightness))
    return {
      type: 'brightness/contrast',
      brightness: value.brightness,
      contrast: value.contrast,
      useLegacy: false,
    };
  if (hasOnly(input, families.exposure))
    return {
      type: 'exposure',
      exposure: value.exposure,
      offset: 0,
      gamma: value.exposureGamma,
    };
  if (hasOnly(input, families.vibrance) && (value.vibrance ?? 0) !== 0)
    return {
      type: 'vibrance',
      vibrance: value.vibrance,
      saturation: value.saturation,
    };
  if (
    hasOnly(input, families.hue) &&
    !Object.keys(value.hueSaturationRanges ?? {}).length
  )
    return {
      type: 'hue/saturation',
      master: hueChannel(value.hue ?? 0, value.saturation ?? 0),
    };
  if (hasOnly(input, families.balance)) {
    const midtones = {
      cyanRed: value.balanceCyanRed ?? 0,
      magentaGreen: value.balanceMagentaGreen ?? 0,
      yellowBlue: value.balanceYellowBlue ?? 0,
    };
    return { type: 'color balance', midtones, preserveLuminosity: true };
  }
  if (hasOnly(input, families.blackWhite) && value.blackWhite)
    return {
      type: 'black & white',
      reds: value.redMix,
      greens: value.greenMix,
      blues: value.blueMix,
      useTint: false,
    };
  if (hasOnly(input, families.photo))
    return {
      type: 'photo filter',
      color: hexToRgb(value.photoFilter ?? '#ec8a32'),
      density: value.photoFilterDensity,
      preserveLuminosity: true,
    };
  if (hasOnly(input, families.levels)) {
    const channelLevels = value.channelLevels ?? {};
    const channel = (key: 'red' | 'green' | 'blue') =>
      channelLevels[key] ? levelToPsd(channelLevels[key]!) : undefined;
    return {
      type: 'levels',
      rgb: levelToPsd({
        black: value.levelsBlack ?? 0,
        white: value.levelsWhite ?? 255,
        gamma: value.levelsGamma ?? 1,
        outputBlack: value.outputBlack ?? 0,
        outputWhite: value.outputWhite ?? 255,
      }),
      red: channel('red'),
      green: channel('green'),
      blue: channel('blue'),
    };
  }
  if (hasOnly(input, families.curves)) {
    const curves = value.curves ?? {};
    return {
      type: 'curves',
      ...Object.fromEntries(
        (['rgb', 'red', 'green', 'blue'] as CurveChannel[])
          .filter((channel) => curves[channel]?.length)
          .map((channel) => [channel, curveToPsd(curves[channel]!)]),
      ),
    };
  }
  if (hasOnly(input, families.mixer))
    return { type: 'channel mixer', monochrome: false, ...value.channelMixer };
  if (hasOnly(input, families.gradient) && value.gradientMap?.amount === 100)
    return {
      type: 'gradient map',
      gradientType: 'solid',
      reverse: value.gradientMap.reverse,
      colorStops: [
        {
          color: hexToRgb(value.gradientMap.shadows),
          location: 0,
          midpoint: 50,
        },
        {
          color: hexToRgb(value.gradientMap.highlights),
          location: 4096,
          midpoint: 50,
        },
      ],
      opacityStops: [
        { opacity: 1, location: 0, midpoint: 50 },
        { opacity: 1, location: 4096, midpoint: 50 },
      ],
    };
  if (hasOnly(input, families.selective)) {
    const selective = value.selectiveColor!;
    return {
      type: 'selective color',
      mode: selective.mode,
      ...Object.fromEntries(
        Object.entries(selective.colors).map(([target, color]) => [
          target,
          {
            c: color!.cyan,
            m: color!.magenta,
            y: color!.yellow,
            k: color!.black,
          },
        ]),
      ),
    };
  }
  return undefined;
}

export function highDepthToPsdBrightness(
  input: HighDepthAdjustments | undefined,
): BrightnessAdjustment | undefined {
  const adjustment = highDepthToPsdAdjustment(input);
  return adjustment?.type === 'brightness/contrast' ? adjustment : undefined;
}

export function supportedPsdAdjustment(
  adjustment: AdjustmentLayer | undefined,
): boolean {
  return Boolean(adjustment && psdAdjustmentToHighDepth(adjustment));
}
