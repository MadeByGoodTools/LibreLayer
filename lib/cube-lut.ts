export type CubeLut = {
  title: string;
  size: number;
  domainMin: [number, number, number];
  domainMax: [number, number, number];
  data: number[];
  builtInTransform?: 'cinema' | 'warm-fade' | 'cool-chrome' | 'mono-punch';
};

const clamp = (value: number, low = 0, high = 1) =>
  Math.max(low, Math.min(high, value));

export function parseCubeLut(source: string): CubeLut {
  let title = 'Imported LUT';
  let size = 0;
  let domainMin: [number, number, number] = [0, 0, 0];
  let domainMax: [number, number, number] = [1, 1, 1];
  const data: number[] = [];
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [command, ...values] = line.split(/\s+/);
    if (command === 'TITLE') {
      title = values.join(' ').replace(/^"|"$/g, '') || title;
      continue;
    }
    if (command === 'LUT_1D_SIZE')
      throw new Error('1D .cube files are not supported yet. Choose a 3D LUT.');
    if (command === 'LUT_3D_SIZE') {
      size = Number(values[0]);
      if (!Number.isInteger(size) || size < 2 || size > 65)
        throw new Error('3D LUT size must be between 2 and 65.');
      continue;
    }
    if (command === 'DOMAIN_MIN' || command === 'DOMAIN_MAX') {
      const parsed = values.slice(0, 3).map(Number);
      if (
        parsed.length !== 3 ||
        parsed.some((value) => !Number.isFinite(value))
      )
        throw new Error(`Invalid ${command} values.`);
      if (command === 'DOMAIN_MIN')
        domainMin = parsed as [number, number, number];
      else domainMax = parsed as [number, number, number];
      continue;
    }
    const triplet = [command, ...values].slice(0, 3).map(Number);
    if (
      triplet.length !== 3 ||
      triplet.some((value) => !Number.isFinite(value))
    )
      throw new Error(`Invalid LUT data row: ${line}`);
    data.push(...triplet.map((value) => clamp(value)));
  }
  if (!size) throw new Error('This file does not declare LUT_3D_SIZE.');
  if (data.length !== size ** 3 * 3)
    throw new Error(
      `Expected ${size ** 3} color rows but found ${Math.floor(data.length / 3)}.`,
    );
  if (domainMin.some((value, index) => value >= domainMax[index]))
    throw new Error('Every LUT domain maximum must exceed its minimum.');
  return { title, size, domainMin, domainMax, data };
}

export function applyCubeLut(
  red: number,
  green: number,
  blue: number,
  lut?: CubeLut,
  amount = 1,
): [number, number, number] {
  if (!lut || !lut.data.length || amount <= 0) return [red, green, blue];
  if (lut.builtInTransform) {
    let output: number[];
    if (lut.builtInTransform === 'cinema') {
      const luma = red * 0.299 + green * 0.587 + blue * 0.114,
        shadow = 1 - luma;
      output = [
        red * 1.04 + luma * 0.035,
        green * 1.01 + shadow * 0.025,
        blue * 1.04 + shadow * 0.055 - luma * 0.025,
      ];
    } else if (lut.builtInTransform === 'warm-fade')
      output = [
        0.055 + red * 0.91 + green * 0.035,
        0.035 + green * 0.91 + red * 0.02,
        0.025 + blue * 0.86,
      ];
    else if (lut.builtInTransform === 'cool-chrome') {
      const contrast = (value: number) => (value - 0.5) * 1.12 + 0.5;
      output = [
        contrast(red) * 0.96,
        contrast(green) * 1.01,
        contrast(blue) * 1.08 + 0.015,
      ];
    } else {
      const luma = (red * 0.25 + green * 0.67 + blue * 0.08 - 0.5) * 1.22 + 0.5;
      output = [luma, luma, luma];
    }
    const strength = clamp(amount);
    return [
      red + (clamp(output[0]) - red) * strength,
      green + (clamp(output[1]) - green) * strength,
      blue + (clamp(output[2]) - blue) * strength,
    ];
  }
  const edge = lut.size - 1,
    scaledRed =
      clamp((red - lut.domainMin[0]) / (lut.domainMax[0] - lut.domainMin[0])) *
      edge,
    scaledGreen =
      clamp(
        (green - lut.domainMin[1]) / (lut.domainMax[1] - lut.domainMin[1]),
      ) * edge,
    scaledBlue =
      clamp((blue - lut.domainMin[2]) / (lut.domainMax[2] - lut.domainMin[2])) *
      edge,
    redLow = Math.floor(scaledRed),
    greenLow = Math.floor(scaledGreen),
    blueLow = Math.floor(scaledBlue),
    redHigh = Math.min(edge, redLow + 1),
    greenHigh = Math.min(edge, greenLow + 1),
    blueHigh = Math.min(edge, blueLow + 1),
    redMix = scaledRed - redLow,
    greenMix = scaledGreen - greenLow,
    blueMix = scaledBlue - blueLow,
    plane = lut.size * lut.size,
    i000 = (blueLow * plane + greenLow * lut.size + redLow) * 3,
    i100 = (blueLow * plane + greenLow * lut.size + redHigh) * 3,
    i010 = (blueLow * plane + greenHigh * lut.size + redLow) * 3,
    i110 = (blueLow * plane + greenHigh * lut.size + redHigh) * 3,
    i001 = (blueHigh * plane + greenLow * lut.size + redLow) * 3,
    i101 = (blueHigh * plane + greenLow * lut.size + redHigh) * 3,
    i011 = (blueHigh * plane + greenHigh * lut.size + redLow) * 3,
    i111 = (blueHigh * plane + greenHigh * lut.size + redHigh) * 3,
    interpolate = (channel: number) => {
      const data = lut.data,
        x00 =
          data[i000 + channel] +
          (data[i100 + channel] - data[i000 + channel]) * redMix,
        x10 =
          data[i010 + channel] +
          (data[i110 + channel] - data[i010 + channel]) * redMix,
        x01 =
          data[i001 + channel] +
          (data[i101 + channel] - data[i001 + channel]) * redMix,
        x11 =
          data[i011 + channel] +
          (data[i111 + channel] - data[i011 + channel]) * redMix,
        y0 = x00 + (x10 - x00) * greenMix,
        y1 = x01 + (x11 - x01) * greenMix;
      return y0 + (y1 - y0) * blueMix;
    },
    outputRed = interpolate(0),
    outputGreen = interpolate(1),
    outputBlue = interpolate(2);
  const strength = clamp(amount);
  return [
    red + (outputRed - red) * strength,
    green + (outputGreen - green) * strength,
    blue + (outputBlue - blue) * strength,
  ];
}
