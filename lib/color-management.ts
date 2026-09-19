export type ColorProfileId =
  | 'srgb'
  | 'display-p3'
  | 'adobe-rgb'
  | 'prophoto-rgb';

export type RenderingIntent =
  | 'relative-colorimetric'
  | 'perceptual'
  | 'saturation'
  | 'absolute-colorimetric';

type Matrix3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

type ColorProfile = {
  id: ColorProfileId;
  name: string;
  version: 2 | 4;
  white: readonly [number, number, number];
  black: number;
  rgbToXyz: Matrix3;
  xyzToRgb: Matrix3;
  decode: (value: number) => number;
  encode: (value: number) => number;
};

const D50 = [0.96422, 1, 0.82521] as const;
const D65 = [0.95047, 1, 1.08883] as const;

const signedPower = (value: number, power: number) =>
  Math.sign(value) * Math.abs(value) ** power;

const srgbDecode = (value: number) =>
  Math.abs(value) <= 0.04045
    ? value / 12.92
    : signedPower((Math.abs(value) + 0.055) / 1.055, 2.4);

const srgbEncode = (value: number) =>
  Math.abs(value) <= 0.0031308
    ? value * 12.92
    : Math.sign(value) * (1.055 * Math.abs(value) ** (1 / 2.4) - 0.055);

const gamma = (power: number) => ({
  decode: (value: number) => signedPower(value, power),
  encode: (value: number) => signedPower(value, 1 / power),
});

const proPhoto = {
  decode: (value: number) =>
    Math.abs(value) <= 16 / 512 ? value / 16 : signedPower(value, 1.8),
  encode: (value: number) =>
    Math.abs(value) <= 1 / 512 ? value * 16 : signedPower(value, 1 / 1.8),
};

export const COLOR_PROFILES: Record<ColorProfileId, ColorProfile> = {
  srgb: {
    id: 'srgb',
    name: 'sRGB IEC61966-2.1',
    version: 4,
    white: D65,
    black: 0.003,
    rgbToXyz: [
      0.4124564, 0.3575761, 0.1804375, 0.2126729, 0.7151522, 0.072175,
      0.0193339, 0.119192, 0.9503041,
    ],
    xyzToRgb: [
      3.2404542, -1.5371385, -0.4985314, -0.969266, 1.8760108, 0.041556,
      0.0556434, -0.2040259, 1.0572252,
    ],
    decode: srgbDecode,
    encode: srgbEncode,
  },
  'display-p3': {
    id: 'display-p3',
    name: 'Display P3',
    version: 4,
    white: D65,
    black: 0.003,
    rgbToXyz: [
      0.48657095, 0.26566769, 0.19821729, 0.22897456, 0.69173852, 0.07928691, 0,
      0.04511338, 1.04394437,
    ],
    xyzToRgb: [
      2.49349691, -0.93138362, -0.40271078, -0.82948897, 1.76266406, 0.02362469,
      0.03584583, -0.07617239, 0.95688452,
    ],
    decode: srgbDecode,
    encode: srgbEncode,
  },
  'adobe-rgb': {
    id: 'adobe-rgb',
    name: 'Adobe RGB (1998)',
    version: 2,
    white: D65,
    black: 0.005,
    rgbToXyz: [
      0.5767309, 0.185554, 0.1881852, 0.2973769, 0.6273491, 0.0752741,
      0.0270343, 0.0706872, 0.9911085,
    ],
    xyzToRgb: [
      2.041369, -0.5649464, -0.3446944, -0.969266, 1.8760108, 0.041556,
      0.0134474, -0.1183897, 1.0154096,
    ],
    ...gamma(563 / 256),
  },
  'prophoto-rgb': {
    id: 'prophoto-rgb',
    name: 'ProPhoto RGB',
    version: 2,
    white: D50,
    black: 0.002,
    rgbToXyz: [
      0.7976749, 0.1351917, 0.0313534, 0.2880402, 0.7118741, 0.0000857, 0, 0,
      0.82521,
    ],
    xyzToRgb: [
      1.3459433, -0.2556075, -0.0511118, -0.5445989, 1.5081673, 0.0205351, 0, 0,
      1.2118128,
    ],
    ...proPhoto,
  },
};

export const normalizeColorProfile = (value: unknown): ColorProfileId =>
  typeof value === 'string' && value in COLOR_PROFILES
    ? (value as ColorProfileId)
    : 'srgb';

export const normalizeRenderingIntent = (value: unknown): RenderingIntent =>
  value === 'perceptual' ||
  value === 'saturation' ||
  value === 'absolute-colorimetric'
    ? value
    : 'relative-colorimetric';

const multiply = (matrix: Matrix3, vector: readonly [number, number, number]) =>
  [
    matrix[0] * vector[0] + matrix[1] * vector[1] + matrix[2] * vector[2],
    matrix[3] * vector[0] + matrix[4] * vector[1] + matrix[5] * vector[2],
    matrix[6] * vector[0] + matrix[7] * vector[1] + matrix[8] * vector[2],
  ] as [number, number, number];

const BRADFORD: Matrix3 = [
  0.8951, 0.2664, -0.1614, -0.7502, 1.7135, 0.0367, 0.0389, -0.0685, 1.0296,
];
const BRADFORD_INVERSE: Matrix3 = [
  0.986993, -0.147054, 0.159963, 0.432305, 0.51836, 0.049291, -0.008529,
  0.040043, 0.968487,
];

const adaptWhite = (
  xyz: readonly [number, number, number],
  sourceWhite: readonly [number, number, number],
  targetWhite: readonly [number, number, number],
) => {
  if (sourceWhite === targetWhite) return [...xyz] as [number, number, number];
  const sourceCone = multiply(BRADFORD, sourceWhite),
    targetCone = multiply(BRADFORD, targetWhite),
    cone = multiply(BRADFORD, xyz);
  return multiply(BRADFORD_INVERSE, [
    cone[0] * (targetCone[0] / sourceCone[0]),
    cone[1] * (targetCone[1] / sourceCone[1]),
    cone[2] * (targetCone[2] / sourceCone[2]),
  ]);
};

const compressPerceptual = (rgb: [number, number, number]) => {
  const minimum = Math.min(...rgb),
    maximum = Math.max(...rgb);
  if (minimum >= 0 && maximum <= 1) return rgb;
  const shoulder = (value: number) =>
    value < 0 ? value / (1 - value) : value > 1 ? 1 - 1 / (1 + value) : value;
  return rgb.map(shoulder) as [number, number, number];
};

const preserveSaturation = (rgb: [number, number, number]) => {
  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722,
    offsets = rgb.map((value) => value - luminance),
    scales = offsets.flatMap((offset) => {
      if (offset > 0) return [(1 - luminance) / offset];
      if (offset < 0) return [-luminance / offset];
      return [];
    }),
    scale = Math.min(1, ...scales.filter(Number.isFinite));
  return offsets.map((offset) => luminance + offset * scale) as [
    number,
    number,
    number,
  ];
};

export function convertColor(
  rgb: readonly [number, number, number],
  sourceId: ColorProfileId,
  targetId: ColorProfileId,
  intent: RenderingIntent = 'relative-colorimetric',
  blackPointCompensation = true,
) {
  if (sourceId === targetId) return [...rgb] as [number, number, number];
  const source = COLOR_PROFILES[sourceId],
    target = COLOR_PROFILES[targetId],
    linear = rgb.map(source.decode) as [number, number, number],
    sourceXyz = multiply(source.rgbToXyz, linear),
    xyz =
      intent === 'absolute-colorimetric'
        ? sourceXyz
        : adaptWhite(sourceXyz, source.white, target.white);
  let targetLinear = multiply(target.xyzToRgb, xyz);
  if (blackPointCompensation) {
    const sourceScale = Math.max(0.0001, 1 - source.black),
      targetScale = 1 - target.black;
    targetLinear = targetLinear.map((value) =>
      value <= 0
        ? value
        : target.black +
          Math.max(0, (value - source.black) / sourceScale) * targetScale,
    ) as [number, number, number];
  }
  if (intent === 'perceptual') targetLinear = compressPerceptual(targetLinear);
  if (intent === 'saturation') targetLinear = preserveSaturation(targetLinear);
  return targetLinear.map(target.encode) as [number, number, number];
}

export function convertRgba(
  pixels: Uint8ClampedArray | Float32Array,
  source: ColorProfileId,
  target: ColorProfileId,
  intent: RenderingIntent = 'relative-colorimetric',
  blackPointCompensation = true,
) {
  const output =
    pixels instanceof Float32Array
      ? new Float32Array(pixels)
      : new Uint8ClampedArray(pixels);
  const divisor = pixels instanceof Float32Array ? 1 : 255;
  for (let index = 0; index < pixels.length; index += 4) {
    const converted = convertColor(
      [
        pixels[index] / divisor,
        pixels[index + 1] / divisor,
        pixels[index + 2] / divisor,
      ],
      source,
      target,
      intent,
      blackPointCompensation,
    );
    output[index] = converted[0] * divisor;
    output[index + 1] = converted[1] * divisor;
    output[index + 2] = converted[2] * divisor;
  }
  return output;
}
