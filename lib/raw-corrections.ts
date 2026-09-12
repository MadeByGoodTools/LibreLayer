export type RawNoiseCorrection = {
  luminance: number;
  chroma: number;
  hotPixels: number;
  banding: number;
};

export type RawLensCorrection = {
  profileId: string;
  distortion: number;
  vignette: number;
  aberration: number;
  defringe: number;
  sharpening: number;
};

export type RawLensProfile = {
  id: string;
  name: string;
  match: RegExp;
  distortion: number;
  vignette: number;
  aberration: number;
};

export const rawLensProfiles: RawLensProfile[] = [
  {
    id: 'generic-wide',
    name: 'Generic wide-angle 10–24 mm',
    match: /(?:^|\D)(?:1[0-9]|2[0-4])(?:\D|$)|wide|ultra/i,
    distortion: 28,
    vignette: 20,
    aberration: 18,
  },
  {
    id: 'generic-telephoto',
    name: 'Generic telephoto 70–600 mm',
    match: /(?:^|\D)(?:7[0-9]|[89][0-9]|[1-5][0-9]{2}|600)(?:\D|$)|tele/i,
    distortion: -5,
    vignette: 8,
    aberration: 5,
  },
  {
    id: 'generic-standard',
    name: 'Generic standard 24–70 mm',
    match: /(?:^|\D)(?:2[4-9]|[3-6][0-9]|70)(?:\D|$)|standard/i,
    distortion: 8,
    vignette: 12,
    aberration: 8,
  },
];

export const defaultRawNoiseCorrection = (): RawNoiseCorrection => ({
  luminance: 0,
  chroma: 0,
  hotPixels: 0,
  banding: 0,
});

export const defaultRawLensCorrection = (): RawLensCorrection => ({
  profileId: 'auto',
  distortion: 0,
  vignette: 0,
  aberration: 0,
  defringe: 0,
  sharpening: 0,
});

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

export const normalizeRawNoiseCorrection = (
  value?: Partial<RawNoiseCorrection>,
): RawNoiseCorrection => ({
  luminance: clamp(value?.luminance ?? 0),
  chroma: clamp(value?.chroma ?? 0),
  hotPixels: clamp(value?.hotPixels ?? 0),
  banding: clamp(value?.banding ?? 0),
});

export const normalizeRawLensCorrection = (
  value?: Partial<RawLensCorrection>,
): RawLensCorrection => {
  const profileId = value?.profileId;
  return {
    profileId:
      profileId === 'none' ||
      profileId === 'auto' ||
      rawLensProfiles.some((profile) => profile.id === profileId)
        ? (profileId ?? 'auto')
        : 'auto',
    distortion: clamp(value?.distortion ?? 0, -100, 100),
    vignette: clamp(value?.vignette ?? 0, -100, 100),
    aberration: clamp(value?.aberration ?? 0),
    defringe: clamp(value?.defringe ?? 0),
    sharpening: clamp(value?.sharpening ?? 0),
  };
};

export const resolveRawLensProfile = (profileId: string, lensName: string) => {
  if (profileId === 'none') return undefined;
  if (profileId !== 'auto')
    return rawLensProfiles.find((profile) => profile.id === profileId);
  return rawLensProfiles.find((profile) => profile.match.test(lensName));
};

const sample = (
  data: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  channel: number,
) => {
  const px = Math.max(0, Math.min(width - 1, Math.round(x))),
    py = Math.max(0, Math.min(height - 1, Math.round(y)));
  return data[(py * width + px) * 3 + channel];
};

const neighborhood = (
  data: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  channel: number,
) => {
  const values: number[] = [];
  for (let oy = -1; oy <= 1; oy++)
    for (let ox = -1; ox <= 1; ox++)
      if (ox || oy) values.push(sample(data, width, height, x + ox, y + oy, channel));
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
};

export const correctRawNoise = (
  source: Float32Array,
  width: number,
  height: number,
  value?: Partial<RawNoiseCorrection>,
) => {
  if (source.length !== width * height * 3)
    throw new Error('RAW noise data does not match its dimensions.');
  const settings = normalizeRawNoiseCorrection(value),
    hotThreshold = 0.12 + (1 - settings.hotPixels / 100) * 0.75,
    cleaned = new Float32Array(source);
  if (settings.hotPixels)
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        for (let channel = 0; channel < 3; channel++) {
          const index = (y * width + x) * 3 + channel,
            median = neighborhood(source, width, height, x, y, channel);
          if (Math.abs(source[index] - median) > hotThreshold)
            cleaned[index] =
              source[index] +
              (median - source[index]) * (settings.hotPixels / 100);
        }
  if (settings.banding) {
    const means = new Float32Array(height * 3),
      global = [0, 0, 0];
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        for (let channel = 0; channel < 3; channel++) {
          const value = cleaned[(y * width + x) * 3 + channel];
          means[y * 3 + channel] += value / width;
          global[channel] += value / (width * height);
        }
    const amount = settings.banding / 100;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        for (let channel = 0; channel < 3; channel++) {
          const index = (y * width + x) * 3 + channel;
          cleaned[index] +=
            (global[channel] - means[y * 3 + channel]) * amount;
        }
  }
  if (!settings.luminance && !settings.chroma) return cleaned;
  const output = new Float32Array(cleaned.length),
    lumaAmount = settings.luminance / 100,
    chromaAmount = settings.chroma / 100;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 3,
        current = [cleaned[index], cleaned[index + 1], cleaned[index + 2]],
        currentLuma = current[0] * 0.2126 + current[1] * 0.7152 + current[2] * 0.0722;
      let total = 0,
        averageLuma = 0,
        averageRedDifference = 0,
        averageBlueDifference = 0;
      for (let oy = -1; oy <= 1; oy++)
        for (let ox = -1; ox <= 1; ox++) {
          const red = sample(cleaned, width, height, x + ox, y + oy, 0),
            green = sample(cleaned, width, height, x + ox, y + oy, 1),
            blue = sample(cleaned, width, height, x + ox, y + oy, 2),
            luma = red * 0.2126 + green * 0.7152 + blue * 0.0722,
            weight = Math.exp(-Math.abs(luma - currentLuma) * 18);
          total += weight;
          averageLuma += luma * weight;
          averageRedDifference += (red - luma) * weight;
          averageBlueDifference += (blue - luma) * weight;
        }
      averageLuma /= total;
      averageRedDifference /= total;
      averageBlueDifference /= total;
      const luma = currentLuma + (averageLuma - currentLuma) * lumaAmount,
        redDifference =
          current[0] -
          currentLuma +
          (averageRedDifference - (current[0] - currentLuma)) * chromaAmount,
        blueDifference =
          current[2] -
          currentLuma +
          (averageBlueDifference - (current[2] - currentLuma)) * chromaAmount;
      output[index] = luma + redDifference;
      output[index + 2] = luma + blueDifference;
      output[index + 1] =
        (luma - output[index] * 0.2126 - output[index + 2] * 0.0722) /
        0.7152;
    }
  return output;
};

export const correctRawLens = (
  source: Float32Array,
  width: number,
  height: number,
  value: Partial<RawLensCorrection> | undefined,
  lensName = '',
) => {
  if (source.length !== width * height * 3)
    throw new Error('RAW optics data does not match its dimensions.');
  const settings = normalizeRawLensCorrection(value),
    profile = resolveRawLensProfile(settings.profileId, lensName),
    distortion = (settings.distortion + (profile?.distortion ?? 0)) / 100,
    vignette = (settings.vignette + (profile?.vignette ?? 0)) / 100,
    aberration = (settings.aberration + (profile?.aberration ?? 0)) / 100,
    output = new Float32Array(source.length),
    centerX = (width - 1) / 2,
    centerY = (height - 1) / 2,
    unit = Math.max(1, Math.min(width, height) / 2);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const nx = (x - centerX) / unit,
        ny = (y - centerY) / unit,
        radiusSquared = nx * nx + ny * ny,
        radial = 1 + distortion * radiusSquared * 0.36,
        sourceX = centerX + nx * radial * unit,
        sourceY = centerY + ny * radial * unit,
        index = (y * width + x) * 3,
        fringe = aberration * radiusSquared * 1.6,
        red = sample(source, width, height, sourceX * (1 + fringe) - centerX * fringe, sourceY * (1 + fringe) - centerY * fringe, 0),
        green = sample(source, width, height, sourceX, sourceY, 1),
        blue = sample(source, width, height, sourceX * (1 - fringe) + centerX * fringe, sourceY * (1 - fringe) + centerY * fringe, 2),
        gain = Math.max(0.1, 1 + vignette * radiusSquared * 0.65),
        purple = Math.max(0, Math.min(red, blue) - green * 1.08),
        defringe = settings.defringe / 100;
      output[index] = (red - purple * defringe) * gain;
      output[index + 1] = green * gain;
      output[index + 2] = (blue - purple * defringe) * gain;
    }
  if (!settings.sharpening) return output;
  const sharpened = new Float32Array(output),
    amount = settings.sharpening / 100;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      for (let channel = 0; channel < 3; channel++) {
        const index = (y * width + x) * 3 + channel,
          blur =
            (sample(output, width, height, x - 1, y, channel) +
              sample(output, width, height, x + 1, y, channel) +
              sample(output, width, height, x, y - 1, channel) +
              sample(output, width, height, x, y + 1, channel)) /
            4;
        sharpened[index] = output[index] + (output[index] - blur) * amount;
      }
  return sharpened;
};
