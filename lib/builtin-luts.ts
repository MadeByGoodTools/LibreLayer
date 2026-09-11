import type { CubeLut } from './cube-lut.ts';

export type BuiltInLutId =
  | 'cinema'
  | 'warm-fade'
  | 'cool-chrome'
  | 'mono-punch';

const clamp = (value: number) => Math.max(0, Math.min(1, value));

const makeLut = (
  title: string,
  transform: (red: number, green: number, blue: number) => number[],
): CubeLut => {
  const size = 9,
    data: number[] = [];
  for (let blue = 0; blue < size; blue++)
    for (let green = 0; green < size; green++)
      for (let red = 0; red < size; red++)
        data.push(
          ...transform(
            red / (size - 1),
            green / (size - 1),
            blue / (size - 1),
          ).map(clamp),
        );
  return {
    title,
    size,
    domainMin: [0, 0, 0],
    domainMax: [1, 1, 1],
    data,
  };
};

export const BUILT_IN_LUTS: Record<BuiltInLutId, CubeLut> = {
  cinema: makeLut('Cinema Teal & Amber', (red, green, blue) => {
    const luma = red * 0.299 + green * 0.587 + blue * 0.114,
      shadow = 1 - luma,
      highlight = luma;
    return [
      red * 1.04 + highlight * 0.035,
      green * 1.01 + shadow * 0.025,
      blue * 1.04 + shadow * 0.055 - highlight * 0.025,
    ];
  }),
  'warm-fade': makeLut('Warm Film Fade', (red, green, blue) => [
    0.055 + red * 0.91 + green * 0.035,
    0.035 + green * 0.91 + red * 0.02,
    0.025 + blue * 0.86,
  ]),
  'cool-chrome': makeLut('Cool Chrome', (red, green, blue) => {
    const contrast = (value: number) => (value - 0.5) * 1.12 + 0.5;
    return [
      contrast(red) * 0.96,
      contrast(green) * 1.01,
      contrast(blue) * 1.08 + 0.015,
    ];
  }),
  'mono-punch': makeLut('Mono Punch', (red, green, blue) => {
    const luma = (red * 0.25 + green * 0.67 + blue * 0.08 - 0.5) * 1.22 + 0.5;
    return [luma, luma, luma];
  }),
};

for (const [id, lut] of Object.entries(BUILT_IN_LUTS) as [
  BuiltInLutId,
  CubeLut,
][])
  lut.builtInTransform = id;

export const BUILT_IN_LUT_OPTIONS = (
  Object.entries(BUILT_IN_LUTS) as [BuiltInLutId, CubeLut][]
).map(([id, lut]) => ({ id, label: lut.title }));
