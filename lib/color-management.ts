export type BuiltinColorProfileId =
  | 'srgb'
  | 'display-p3'
  | 'adobe-rgb'
  | 'prophoto-rgb';
export type CustomColorProfileId = `icc-${string}`;
export type ColorProfileId = BuiltinColorProfileId | CustomColorProfileId;

export type RenderingIntent =
  | 'relative-colorimetric'
  | 'perceptual'
  | 'saturation'
  | 'absolute-colorimetric';

export type Matrix3 = readonly [
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

export type IccTransferCurve =
  | { kind: 'gamma'; gamma: number }
  | { kind: 'table'; values: number[] }
  | {
      kind: 'parametric';
      functionType: 0 | 1 | 2 | 3 | 4;
      parameters: number[];
    };

export type PortableIccProfile = {
  id: CustomColorProfileId;
  name: string;
  version: 2 | 4;
  white: readonly [number, number, number];
  black: number;
  rgbToXyz: Matrix3;
  xyzToRgb: Matrix3;
  curves: readonly [IccTransferCurve, IccTransferCurve, IccTransferCurve];
  sourceSha256: string;
};

type ColorProfile = {
  id: ColorProfileId;
  name: string;
  version: 2 | 4;
  white: readonly [number, number, number];
  black: number;
  rgbToXyz: Matrix3;
  xyzToRgb: Matrix3;
  decode: readonly [
    (value: number) => number,
    (value: number) => number,
    (value: number) => number,
  ];
  encode: readonly [
    (value: number) => number,
    (value: number) => number,
    (value: number) => number,
  ];
  portable?: PortableIccProfile;
};

const D50 = [0.96422, 1, 0.82521] as const;
const D65 = [0.95047, 1, 1.08883] as const;

const signedPower = (value: number, power: number) =>
  Math.sign(value) * Math.abs(value) ** power;

const srgbDecode = (value: number) =>
  Math.abs(value) <= 0.04045
    ? value / 12.92
    : Math.sign(value) * ((Math.abs(value) + 0.055) / 1.055) ** 2.4;

const srgbEncode = (value: number) =>
  Math.abs(value) <= 0.0031308
    ? value * 12.92
    : Math.sign(value) * (1.055 * Math.abs(value) ** (1 / 2.4) - 0.055);

const gammaFunctions = (power: number) =>
  [
    (value: number) => signedPower(value, power),
    (value: number) => signedPower(value, 1 / power),
  ] as const;

const proPhoto = {
  decode: (value: number) =>
    Math.abs(value) <= 16 / 512 ? value / 16 : signedPower(value, 1.8),
  encode: (value: number) =>
    Math.abs(value) <= 1 / 512 ? value * 16 : signedPower(value, 1 / 1.8),
};

const sameChannels = <T>(value: T) => [value, value, value] as const;
const srgbFunctions = { decode: srgbDecode, encode: srgbEncode };
const adobeFunctions = gammaFunctions(563 / 256);

export const COLOR_PROFILES: Record<BuiltinColorProfileId, ColorProfile> = {
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
    decode: sameChannels(srgbFunctions.decode),
    encode: sameChannels(srgbFunctions.encode),
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
    decode: sameChannels(srgbFunctions.decode),
    encode: sameChannels(srgbFunctions.encode),
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
    decode: sameChannels(adobeFunctions[0]),
    encode: sameChannels(adobeFunctions[1]),
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
    decode: sameChannels(proPhoto.decode),
    encode: sameChannels(proPhoto.encode),
  },
};

const customColorProfiles = new Map<CustomColorProfileId, ColorProfile>();

const finiteTuple = (value: unknown, size: number, limit = 32) =>
  Array.isArray(value) &&
  value.length === size &&
  value.every(
    (item) =>
      typeof item === 'number' &&
      Number.isFinite(item) &&
      Math.abs(item) <= limit,
  );

const validCurve = (curve: unknown): curve is IccTransferCurve => {
  if (!curve || typeof curve !== 'object') return false;
  const candidate = curve as IccTransferCurve;
  if (candidate.kind === 'gamma')
    return (
      Number.isFinite(candidate.gamma) &&
      candidate.gamma >= 0.1 &&
      candidate.gamma <= 10
    );
  if (candidate.kind === 'table')
    return (
      Array.isArray(candidate.values) &&
      candidate.values.length >= 2 &&
      candidate.values.length <= 65_536 &&
      candidate.values.every(
        (value) => Number.isFinite(value) && value >= 0 && value <= 1,
      )
    );
  return (
    candidate.kind === 'parametric' &&
    Number.isInteger(candidate.functionType) &&
    candidate.functionType >= 0 &&
    candidate.functionType <= 4 &&
    Array.isArray(candidate.parameters) &&
    candidate.parameters.length === [1, 3, 4, 5, 7][candidate.functionType] &&
    candidate.parameters.every(
      (value) => Number.isFinite(value) && Math.abs(value) <= 64,
    )
  );
};

export function validatePortableIccProfile(value: unknown): PortableIccProfile {
  if (!value || typeof value !== 'object') throw Error('Invalid ICC profile');
  const profile = value as PortableIccProfile;
  if (
    typeof profile.id !== 'string' ||
    !/^icc-[a-f0-9]{24}$/.test(profile.id) ||
    typeof profile.name !== 'string' ||
    !profile.name.trim() ||
    profile.name.length > 160 ||
    (profile.version !== 2 && profile.version !== 4) ||
    !finiteTuple(profile.white, 3, 4) ||
    !finiteTuple(profile.rgbToXyz, 9) ||
    !finiteTuple(profile.xyzToRgb, 9) ||
    !Number.isFinite(profile.black) ||
    profile.black < 0 ||
    profile.black > 0.25 ||
    !Array.isArray(profile.curves) ||
    profile.curves.length !== 3 ||
    !profile.curves.every(validCurve) ||
    typeof profile.sourceSha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(profile.sourceSha256) ||
    profile.id !== `icc-${profile.sourceSha256.slice(0, 24)}`
  )
    throw Error('Invalid or unsupported ICC matrix profile');
  return structuredClone(profile);
}

const curveFunction = (curve: IccTransferCurve) => {
  const positive = (value: number) => {
    if (curve.kind === 'gamma') return value ** curve.gamma;
    if (curve.kind === 'table') {
      if (value <= 0) return 0;
      const values = curve.values,
        position = value * (values.length - 1),
        index = Math.min(values.length - 2, Math.floor(position));
      if (value >= 1) {
        const slope = (values.at(-1)! - values.at(-2)!) * (values.length - 1);
        return values.at(-1)! + (value - 1) * Math.max(0, slope);
      }
      return (
        values[index] + (values[index + 1] - values[index]) * (position - index)
      );
    }
    const [g, a = 1, b = 0, c = 0, d = 0, e = 0, f = 0] = curve.parameters;
    switch (curve.functionType) {
      case 0:
        return value ** g;
      case 1:
        return value >= -b / a ? (a * value + b) ** g : 0;
      case 2:
        return value >= -b / a ? (a * value + b) ** g + c : c;
      case 3:
        return value >= d ? (a * value + b) ** g : c * value;
      case 4:
        return value >= d ? (a * value + b) ** g + e : c * value + f;
    }
  };
  const decode = (value: number) =>
    Math.sign(value) * positive(Math.abs(value));
  const encode = (value: number) => {
    const sign = Math.sign(value),
      target = Math.abs(value);
    let low = 0,
      high = Math.max(1, target * 2 + 1);
    for (let iteration = 0; iteration < 28; iteration++) {
      const middle = (low + high) / 2;
      if (positive(middle) < target) low = middle;
      else high = middle;
    }
    return sign * ((low + high) / 2);
  };
  return { decode, encode };
};

export function registerIccProfile(value: unknown) {
  const portable = validatePortableIccProfile(value),
    functions = portable.curves.map(curveFunction);
  customColorProfiles.set(portable.id, {
    ...portable,
    portable,
    decode: [functions[0].decode, functions[1].decode, functions[2].decode],
    encode: [functions[0].encode, functions[1].encode, functions[2].encode],
  });
  return portable;
}

export const installedIccProfiles = () =>
  [...customColorProfiles.values()].map((profile) => profile.portable!);

export const portableIccProfile = (id: ColorProfileId) =>
  id.startsWith('icc-')
    ? customColorProfiles.get(id as CustomColorProfileId)?.portable
    : undefined;

export const resolveColorProfile = (
  value: ColorProfileId | PortableIccProfile,
): ColorProfile => {
  if (typeof value !== 'string') {
    const registered = registerIccProfile(value);
    return customColorProfiles.get(registered.id)!;
  }
  const profile =
    value in COLOR_PROFILES
      ? COLOR_PROFILES[value as BuiltinColorProfileId]
      : customColorProfiles.get(value as CustomColorProfileId);
  if (!profile) throw Error('The document ICC profile is not installed.');
  return profile;
};

export const colorProfileName = (id: ColorProfileId) =>
  resolveColorProfile(id).name;

export const normalizeColorProfile = (value: unknown): ColorProfileId => {
  if (typeof value === 'string' && value in COLOR_PROFILES)
    return value as BuiltinColorProfileId;
  if (
    typeof value === 'string' &&
    /^icc-[a-f0-9]{24}$/.test(value) &&
    customColorProfiles.has(value as CustomColorProfileId)
  )
    return value as CustomColorProfileId;
  return 'srgb';
};

const signature = (bytes: Uint8Array, offset: number) =>
  String.fromCharCode(...bytes.slice(offset, offset + 4));

const invertMatrix = (matrix: Matrix3): Matrix3 => {
  const [a, b, c, d, e, f, g, h, i] = matrix,
    A = e * i - f * h,
    B = c * h - b * i,
    C = b * f - c * e,
    D = f * g - d * i,
    E = a * i - c * g,
    F = c * d - a * f,
    G = d * h - e * g,
    H = b * g - a * h,
    I = a * e - b * d,
    determinant = a * A + b * D + c * G;
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-8)
    throw Error('The ICC colorant matrix is singular.');
  return [A, B, C, D, E, F, G, H, I].map(
    (value) => value / determinant,
  ) as unknown as Matrix3;
};

const fixed16 = (view: DataView, offset: number) =>
  view.getInt32(offset, false) / 65536;

const readXyzTag = (
  bytes: Uint8Array,
  view: DataView,
  tag: { offset: number; size: number },
) => {
  if (tag.size < 20 || signature(bytes, tag.offset) !== 'XYZ ')
    throw Error('An ICC XYZ tag is malformed.');
  return [
    fixed16(view, tag.offset + 8),
    fixed16(view, tag.offset + 12),
    fixed16(view, tag.offset + 16),
  ] as [number, number, number];
};

const readCurveTag = (
  bytes: Uint8Array,
  view: DataView,
  tag: { offset: number; size: number },
): IccTransferCurve => {
  const type = signature(bytes, tag.offset);
  if (type === 'curv') {
    if (tag.size < 12) throw Error('An ICC curve tag is malformed.');
    const count = view.getUint32(tag.offset + 8, false);
    if (count === 0) return { kind: 'gamma', gamma: 1 };
    if (count === 1) {
      if (tag.size < 14) throw Error('An ICC gamma curve is truncated.');
      return {
        kind: 'gamma',
        gamma: view.getUint16(tag.offset + 12, false) / 256,
      };
    }
    if (count > 65_536 || tag.size < 12 + count * 2)
      throw Error('An ICC sampled curve is too large or truncated.');
    return {
      kind: 'table',
      values: Array.from(
        { length: count },
        (_, index) =>
          view.getUint16(tag.offset + 12 + index * 2, false) / 65535,
      ),
    };
  }
  if (type === 'para') {
    if (tag.size < 12) throw Error('An ICC parametric curve is malformed.');
    const functionType = view.getUint16(tag.offset + 8, false);
    if (functionType > 4) throw Error('Unsupported ICC parametric curve type.');
    const count = [1, 3, 4, 5, 7][functionType];
    if (tag.size < 12 + count * 4)
      throw Error('An ICC parametric curve is truncated.');
    return {
      kind: 'parametric',
      functionType: functionType as 0 | 1 | 2 | 3 | 4,
      parameters: Array.from({ length: count }, (_, index) =>
        fixed16(view, tag.offset + 12 + index * 4),
      ),
    };
  }
  throw Error('Only ICC curve and parametric-curve tags are supported.');
};

const readProfileName = (
  bytes: Uint8Array,
  view: DataView,
  tag?: { offset: number; size: number },
) => {
  if (!tag) return 'Imported RGB profile';
  const type = signature(bytes, tag.offset);
  if (type === 'desc' && tag.size >= 13) {
    const count = Math.min(
      view.getUint32(tag.offset + 8, false),
      tag.size - 12,
    );
    return new TextDecoder('latin1')
      .decode(bytes.slice(tag.offset + 12, tag.offset + 12 + count))
      .split('\0', 1)[0]
      .trim();
  }
  if (type === 'mluc' && tag.size >= 28) {
    const count = view.getUint32(tag.offset + 8, false),
      recordSize = view.getUint32(tag.offset + 12, false);
    if (
      !count ||
      count > 128 ||
      recordSize < 12 ||
      16 + count * recordSize > tag.size
    )
      throw Error('The ICC localized profile name is malformed.');
    const entry = tag.offset + 16,
      length = view.getUint32(entry + 4, false),
      relative = view.getUint32(entry + 8, false);
    if (relative + length > tag.size || length > 4096 || length % 2)
      throw Error('The ICC localized profile name is truncated.');
    let result = '';
    for (let index = 0; index < length; index += 2)
      result += String.fromCharCode(
        view.getUint16(tag.offset + relative + index, false),
      );
    return result.split('\0', 1)[0].trim();
  }
  return 'Imported RGB profile';
};

export async function parseIccProfile(input: ArrayBuffer | Uint8Array) {
  const bytes =
    input instanceof Uint8Array ? new Uint8Array(input) : new Uint8Array(input);
  if (bytes.length < 132 || bytes.length > 4 * 1024 * 1024)
    throw Error('ICC profiles must be between 132 bytes and 4 MB.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    declaredSize = view.getUint32(0, false);
  if (declaredSize < 132 || declaredSize > bytes.length)
    throw Error('The ICC profile size header is invalid.');
  if (signature(bytes, 36) !== 'acsp')
    throw Error('This is not an ICC profile.');
  const version = bytes[8];
  if (version !== 2 && version !== 4)
    throw Error('Only ICC version 2 and version 4 profiles are supported.');
  if (signature(bytes, 16) !== 'RGB ')
    throw Error('Only RGB ICC profiles can be used as document profiles.');
  if (signature(bytes, 20) !== 'XYZ ')
    throw Error('Only XYZ-based ICC matrix profiles are supported.');
  const count = view.getUint32(128, false);
  if (!count || count > 128 || 132 + count * 12 > declaredSize)
    throw Error('The ICC tag table is invalid.');
  const tags = new Map<string, { offset: number; size: number }>();
  for (let index = 0; index < count; index++) {
    const entry = 132 + index * 12,
      name = signature(bytes, entry),
      offset = view.getUint32(entry + 4, false),
      size = view.getUint32(entry + 8, false);
    if (offset < 128 || size < 8 || offset + size > declaredSize)
      throw Error(`The ICC ${name} tag is outside the profile.`);
    tags.set(name, { offset, size });
  }
  for (const required of [
    'rXYZ',
    'gXYZ',
    'bXYZ',
    'rTRC',
    'gTRC',
    'bTRC',
    'wtpt',
  ])
    if (!tags.has(required))
      throw Error(
        'This ICC profile uses unsupported LUT transforms instead of an RGB matrix.',
      );
  const red = readXyzTag(bytes, view, tags.get('rXYZ')!),
    green = readXyzTag(bytes, view, tags.get('gXYZ')!),
    blue = readXyzTag(bytes, view, tags.get('bXYZ')!),
    white = readXyzTag(bytes, view, tags.get('wtpt')!),
    blackTag = tags.get('bkpt'),
    black = blackTag
      ? Math.max(0, Math.min(0.25, readXyzTag(bytes, view, blackTag)[1]))
      : 0,
    rgbToXyz = [
      red[0],
      green[0],
      blue[0],
      red[1],
      green[1],
      blue[1],
      red[2],
      green[2],
      blue[2],
    ] as Matrix3,
    digest = Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', bytes.slice(0, declaredSize)),
      ),
      (value) => value.toString(16).padStart(2, '0'),
    ).join('');
  return validatePortableIccProfile({
    id: `icc-${digest.slice(0, 24)}`,
    name:
      readProfileName(bytes, view, tags.get('desc')).slice(0, 160) ||
      'Imported RGB profile',
    version,
    white,
    black,
    rgbToXyz,
    xyzToRgb: invertMatrix(rgbToXyz),
    curves: [
      readCurveTag(bytes, view, tags.get('rTRC')!),
      readCurveTag(bytes, view, tags.get('gTRC')!),
      readCurveTag(bytes, view, tags.get('bTRC')!),
    ],
    sourceSha256: digest,
  });
}

const ICC_LIBRARY_KEY = 'librelayer-icc-profiles-v1';

export function loadInstalledIccProfiles(storage: Pick<Storage, 'getItem'>) {
  try {
    const values = JSON.parse(storage.getItem(ICC_LIBRARY_KEY) ?? '[]');
    if (!Array.isArray(values)) return [];
    return values.slice(0, 24).flatMap((value) => {
      try {
        return [registerIccProfile(value)];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

export function saveInstalledIccProfiles(storage: Pick<Storage, 'setItem'>) {
  storage.setItem(
    ICC_LIBRARY_KEY,
    JSON.stringify(installedIccProfiles().slice(-24)),
  );
}

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
  sourceId: ColorProfileId | PortableIccProfile,
  targetId: ColorProfileId | PortableIccProfile,
  intent: RenderingIntent = 'relative-colorimetric',
  blackPointCompensation = true,
) {
  const source = resolveColorProfile(sourceId),
    target = resolveColorProfile(targetId);
  if (source.id === target.id) return [...rgb] as [number, number, number];
  const linear = rgb.map((value, channel) => source.decode[channel](value)) as [
      number,
      number,
      number,
    ],
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
  return targetLinear.map((value, channel) =>
    target.encode[channel](value),
  ) as [number, number, number];
}

export function convertRgba(
  pixels: Uint8ClampedArray | Float32Array,
  source: ColorProfileId | PortableIccProfile,
  target: ColorProfileId | PortableIccProfile,
  intent: RenderingIntent = 'relative-colorimetric',
  blackPointCompensation = true,
) {
  const sourceId =
      typeof source === 'string' ? source : registerIccProfile(source).id,
    targetId =
      typeof target === 'string' ? target : registerIccProfile(target).id;
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
      sourceId,
      targetId,
      intent,
      blackPointCompensation,
    );
    output[index] = converted[0] * divisor;
    output[index + 1] = converted[1] * divisor;
    output[index + 2] = converted[2] * divisor;
  }
  return output;
}

export async function convertRgbaChunked(
  pixels: Uint8ClampedArray | Float32Array,
  source: ColorProfileId | PortableIccProfile,
  target: ColorProfileId | PortableIccProfile,
  intent: RenderingIntent = 'relative-colorimetric',
  blackPointCompensation = true,
  options: {
    chunkPixels?: number;
    signal?: AbortSignal;
    onProgress?: (progress: number) => void;
  } = {},
) {
  const sourceId =
      typeof source === 'string' ? source : registerIccProfile(source).id,
    targetId =
      typeof target === 'string' ? target : registerIccProfile(target).id;
  const output =
      pixels instanceof Float32Array
        ? new Float32Array(pixels)
        : new Uint8ClampedArray(pixels),
    divisor = pixels instanceof Float32Array ? 1 : 255,
    chunkChannels =
      Math.max(1024, Math.min(1_048_576, options.chunkPixels ?? 65_536)) * 4;
  for (let start = 0; start < pixels.length; start += chunkChannels) {
    if (options.signal?.aborted)
      throw new DOMException('The operation was cancelled.', 'AbortError');
    const end = Math.min(pixels.length, start + chunkChannels);
    for (let index = start; index < end; index += 4) {
      const converted = convertColor(
        [
          pixels[index] / divisor,
          pixels[index + 1] / divisor,
          pixels[index + 2] / divisor,
        ],
        sourceId,
        targetId,
        intent,
        blackPointCompensation,
      );
      output[index] = converted[0] * divisor;
      output[index + 1] = converted[1] * divisor;
      output[index + 2] = converted[2] * divisor;
    }
    options.onProgress?.(Math.round((end / pixels.length) * 100));
    if (end < pixels.length)
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  return output;
}
