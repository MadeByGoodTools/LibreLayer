export type RenderFilter =
  | 'oil-paint'
  | 'lighting'
  | 'clouds'
  | 'fibers'
  | 'filter-gallery'
  | 'custom-convolution';

const byte = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
const hash = (x: number, y: number, seed: number) => {
  let value =
    Math.imul(x + seed * 1013, 374761393) ^
    Math.imul(y + seed * 9176, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
};

export const parseConvolutionKernel = (text: string) => {
  const values = text
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number);
  if (values.length !== 9 || values.some((value) => !Number.isFinite(value)))
    return [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const magnitude = values.reduce((sum, value) => sum + Math.abs(value), 0);
  if (!magnitude || magnitude > 64)
    throw Error('Convolution kernel strength must be between 0 and 64');
  return values;
};

const sample = (
  source: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  channel: number,
) =>
  source[
    (Math.max(0, Math.min(height - 1, y)) * width +
      Math.max(0, Math.min(width - 1, x))) *
      4 +
      channel
  ];

export function applyRenderFilter(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  operation: RenderFilter,
  amount: number,
  secondary: number,
  color: [number, number, number] = [255, 214, 170],
  kernel = parseConvolutionKernel(''),
) {
  if (width < 1 || height < 1 || source.length !== width * height * 4)
    throw Error('Render filter dimensions are invalid');
  const output = new Uint8ClampedArray(source.length),
    strength = Math.max(0, Math.min(1, amount / 100)),
    radius = 1 + Math.round(strength * 4),
    seed = Math.round(secondary * 97);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      if (operation === 'custom-convolution') {
        const divisor = kernel.reduce((sum, value) => sum + value, 0) || 1;
        for (let channel = 0; channel < 3; channel++) {
          let total = 0,
            k = 0;
          for (let oy = -1; oy <= 1; oy++)
            for (let ox = -1; ox <= 1; ox++)
              total +=
                sample(source, width, height, x + ox, y + oy, channel) *
                kernel[k++];
          output[index + channel] = byte(total / divisor);
        }
      } else if (operation === 'clouds' || operation === 'fibers') {
        const broad = hash(Math.floor(x / 12), Math.floor(y / 12), seed),
          fine = hash(
            operation === 'fibers' ? Math.floor(x / 2) : x,
            operation === 'fibers' ? Math.floor(y / 24) : y,
            seed + 7,
          ),
          noise = (broad * 0.68 + fine * 0.32) * 255;
        for (let channel = 0; channel < 3; channel++)
          output[index + channel] = byte(
            source[index + channel] * (1 - strength) + noise * strength,
          );
      } else if (operation === 'lighting') {
        const dx = x / Math.max(1, width - 1) - secondary / 100,
          dy = y / Math.max(1, height - 1) - 0.42,
          light = Math.max(0, 1 - Math.hypot(dx, dy) * 1.7) * strength;
        for (let channel = 0; channel < 3; channel++)
          output[index + channel] = byte(
            source[index + channel] * (0.72 + light * 0.55) +
              color[channel] * light * 0.22,
          );
      } else {
        for (let channel = 0; channel < 3; channel++) {
          let total = 0,
            count = 0;
          for (let oy = -radius; oy <= radius; oy++)
            for (let ox = -radius; ox <= radius; ox++) {
              if (ox * ox + oy * oy > radius * radius) continue;
              total += sample(source, width, height, x + ox, y + oy, channel);
              count++;
            }
          const average = total / Math.max(1, count),
            original = source[index + channel];
          output[index + channel] =
            operation === 'oil-paint'
              ? byte(
                  Math.round(average / Math.max(2, 18 - secondary / 7)) *
                    Math.max(2, 18 - secondary / 7),
                )
              : byte(128 + (original - average) * (1 + strength * 2.5));
        }
      }
      output[index + 3] = source[index + 3];
    }
  return output;
}
