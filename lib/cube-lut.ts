export type CubeLut = {
  title: string;
  size: number;
  domainMin: [number, number, number];
  domainMax: [number, number, number];
  data: number[];
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
  const input = [red, green, blue].map((value, channel) =>
    clamp(
      (value - lut.domainMin[channel]) /
        (lut.domainMax[channel] - lut.domainMin[channel]),
    ),
  );
  const scaled = input.map((value) => value * (lut.size - 1));
  const low = scaled.map(Math.floor),
    high = scaled.map((value, index) => Math.min(lut.size - 1, low[index] + 1)),
    mix = scaled.map((value, index) => value - low[index]);
  const sample = (r: number, g: number, b: number, channel: number) =>
    lut.data[(b * lut.size * lut.size + g * lut.size + r) * 3 + channel] ?? 0;
  const output = [0, 1, 2].map((channel) => {
    const c000 = sample(low[0], low[1], low[2], channel),
      c100 = sample(high[0], low[1], low[2], channel),
      c010 = sample(low[0], high[1], low[2], channel),
      c110 = sample(high[0], high[1], low[2], channel),
      c001 = sample(low[0], low[1], high[2], channel),
      c101 = sample(high[0], low[1], high[2], channel),
      c011 = sample(low[0], high[1], high[2], channel),
      c111 = sample(high[0], high[1], high[2], channel),
      x00 = c000 + (c100 - c000) * mix[0],
      x10 = c010 + (c110 - c010) * mix[0],
      x01 = c001 + (c101 - c001) * mix[0],
      x11 = c011 + (c111 - c011) * mix[0],
      y0 = x00 + (x10 - x00) * mix[1],
      y1 = x01 + (x11 - x01) * mix[1];
    return y0 + (y1 - y0) * mix[2];
  });
  const strength = clamp(amount);
  return [
    red + (output[0] - red) * strength,
    green + (output[1] - green) * strength,
    blue + (output[2] - blue) * strength,
  ];
}
