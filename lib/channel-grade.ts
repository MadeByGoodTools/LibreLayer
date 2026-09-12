export type ColorChannel = 'rgb' | 'red' | 'green' | 'blue' | 'alpha';
export type ChannelLevelKey =
  | 'inputBlack'
  | 'inputWhite'
  | 'gamma'
  | 'outputBlack'
  | 'outputWhite';
export type GradeRange = 'shadows' | 'midtones' | 'highlights';
export type GradeOffsetKey = 'red' | 'green' | 'blue';

export type ChannelLevels = Record<ChannelLevelKey, number>;
export type GradeOffset = Record<GradeOffsetKey, number>;
export type ColorGrade = {
  levels: Record<ColorChannel, ChannelLevels>;
  temperature: number;
  tint: number;
  vibrance: number;
  shadows: GradeOffset;
  midtones: GradeOffset;
  highlights: GradeOffset;
};

export const neutralChannelLevels = (): ChannelLevels => ({
  inputBlack: 0,
  inputWhite: 255,
  gamma: 1,
  outputBlack: 0,
  outputWhite: 255,
});

const neutralOffset = (): GradeOffset => ({ red: 0, green: 0, blue: 0 });

export const createDefaultColorGrade = (): ColorGrade => ({
  levels: {
    rgb: neutralChannelLevels(),
    red: neutralChannelLevels(),
    green: neutralChannelLevels(),
    blue: neutralChannelLevels(),
    alpha: neutralChannelLevels(),
  },
  temperature: 0,
  tint: 0,
  vibrance: 0,
  shadows: neutralOffset(),
  midtones: neutralOffset(),
  highlights: neutralOffset(),
});

const finite = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function resolveColorGrade(value?: Partial<ColorGrade>): ColorGrade {
  const base = createDefaultColorGrade();
  const levels = Object.fromEntries(
    (Object.keys(base.levels) as ColorChannel[]).map((channel) => {
      const source = value?.levels?.[channel];
      const inputBlack = clamp(finite(source?.inputBlack, 0), 0, 254);
      const inputWhite = clamp(
        finite(source?.inputWhite, 255),
        inputBlack + 1,
        255,
      );
      return [
        channel,
        {
          inputBlack,
          inputWhite,
          gamma: clamp(finite(source?.gamma, 1), 0.1, 9.99),
          outputBlack: clamp(finite(source?.outputBlack, 0), 0, 255),
          outputWhite: clamp(finite(source?.outputWhite, 255), 0, 255),
        },
      ];
    }),
  ) as Record<ColorChannel, ChannelLevels>;
  const offset = (range: GradeRange): GradeOffset => ({
    red: clamp(finite(value?.[range]?.red, 0), -100, 100),
    green: clamp(finite(value?.[range]?.green, 0), -100, 100),
    blue: clamp(finite(value?.[range]?.blue, 0), -100, 100),
  });
  return {
    levels,
    temperature: clamp(finite(value?.temperature, 0), -100, 100),
    tint: clamp(finite(value?.tint, 0), -100, 100),
    vibrance: clamp(finite(value?.vibrance, 0), -100, 100),
    shadows: offset('shadows'),
    midtones: offset('midtones'),
    highlights: offset('highlights'),
  };
}

export function colorGradeIsNeutral(value?: Partial<ColorGrade>) {
  const grade = resolveColorGrade(value);
  return (
    grade.temperature === 0 &&
    grade.tint === 0 &&
    grade.vibrance === 0 &&
    (['shadows', 'midtones', 'highlights'] as GradeRange[]).every((range) =>
      Object.values(grade[range]).every((amount) => amount === 0),
    ) &&
    (Object.keys(grade.levels) as ColorChannel[]).every((channel) => {
      const level = grade.levels[channel];
      return (
        level.inputBlack === 0 &&
        level.inputWhite === 255 &&
        level.gamma === 1 &&
        level.outputBlack === 0 &&
        level.outputWhite === 255
      );
    })
  );
}

const levelValue = (value: number, level: ChannelLevels) => {
  const normalized = clamp(
    (value - level.inputBlack) / (level.inputWhite - level.inputBlack),
    0,
    1,
  );
  const gamma = normalized ** (1 / level.gamma);
  return level.outputBlack + gamma * (level.outputWhite - level.outputBlack);
};

export function applyColorGradeToPixels(
  pixels: Uint8ClampedArray,
  value?: Partial<ColorGrade>,
) {
  if (colorGradeIsNeutral(value)) return pixels;
  const grade = resolveColorGrade(value);
  const channelNames = ['red', 'green', 'blue'] as const;
  for (let index = 0; index < pixels.length; index += 4) {
    let red = pixels[index] / 255;
    let green = pixels[index + 1] / 255;
    let blue = pixels[index + 2] / 255;

    const temperature = grade.temperature / 100;
    const tint = grade.tint / 100;
    red += temperature * 0.14 + tint * 0.07;
    green -= tint * 0.12;
    blue -= temperature * 0.14 + tint * 0.07;

    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const saturation = maximum - minimum;
    const average = (red + green + blue) / 3;
    const vibrance = (grade.vibrance / 100) * (1 - clamp(saturation, 0, 1));
    red = average + (red - average) * (1 + vibrance);
    green = average + (green - average) * (1 + vibrance);
    blue = average + (blue - average) * (1 + vibrance);

    const luma = clamp(red * 0.2126 + green * 0.7152 + blue * 0.0722, 0, 1);
    const weights = {
      shadows: (1 - luma) ** 2,
      midtones: 1 - Math.abs(luma * 2 - 1),
      highlights: luma ** 2,
    };
    const channels = [red, green, blue];
    for (let channel = 0; channel < 3; channel++)
      for (const range of ['shadows', 'midtones', 'highlights'] as const)
        channels[channel] +=
          (grade[range][channelNames[channel]] / 100) * weights[range] * 0.3;

    for (let channel = 0; channel < 3; channel++) {
      const composite = levelValue(channels[channel] * 255, grade.levels.rgb);
      pixels[index + channel] = levelValue(
        composite,
        grade.levels[channelNames[channel]],
      );
    }
    pixels[index + 3] = levelValue(pixels[index + 3], grade.levels.alpha);
  }
  return pixels;
}

/** Apply the legacy channel-grade recipe without quantizing a float render surface. */
export function applyColorGradeToFloat32(
  pixels: Float32Array,
  value?: Partial<ColorGrade>,
) {
  if (colorGradeIsNeutral(value)) return pixels;
  const grade = resolveColorGrade(value);
  const channelNames = ['red', 'green', 'blue'] as const;
  for (let index = 0; index < pixels.length; index += 4) {
    let red = pixels[index];
    let green = pixels[index + 1];
    let blue = pixels[index + 2];

    const temperature = grade.temperature / 100;
    const tint = grade.tint / 100;
    red += temperature * 0.14 + tint * 0.07;
    green -= tint * 0.12;
    blue -= temperature * 0.14 + tint * 0.07;

    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const saturation = maximum - minimum;
    const average = (red + green + blue) / 3;
    const vibrance = (grade.vibrance / 100) * (1 - clamp(saturation, 0, 1));
    red = average + (red - average) * (1 + vibrance);
    green = average + (green - average) * (1 + vibrance);
    blue = average + (blue - average) * (1 + vibrance);

    const luma = clamp(red * 0.2126 + green * 0.7152 + blue * 0.0722, 0, 1);
    const weights = {
      shadows: (1 - luma) ** 2,
      midtones: 1 - Math.abs(luma * 2 - 1),
      highlights: luma ** 2,
    };
    const channels = [red, green, blue];
    for (let channel = 0; channel < 3; channel++)
      for (const range of ['shadows', 'midtones', 'highlights'] as const)
        channels[channel] +=
          (grade[range][channelNames[channel]] / 100) * weights[range] * 0.3;

    for (let channel = 0; channel < 3; channel++) {
      const composite = levelValue(channels[channel] * 255, grade.levels.rgb);
      pixels[index + channel] =
        levelValue(composite, grade.levels[channelNames[channel]]) / 255;
    }
    pixels[index + 3] =
      levelValue(pixels[index + 3] * 255, grade.levels.alpha) / 255;
  }
  return pixels;
}
