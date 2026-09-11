export type LuminosityRange = 'shadows' | 'midtones' | 'highlights';

export const pixelLuminance = (red: number, green: number, blue: number) =>
  0.2126 * red + 0.7152 * green + 0.0722 * blue;

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0 || 1)));
  return x * x * (3 - 2 * x);
};

export const luminosityRangeWeight = (
  luminance: number,
  range: LuminosityRange,
  softness = 48,
) => {
  const value = Math.max(0, Math.min(255, luminance)),
    feather = Math.max(1, Math.min(127, softness));
  if (range === 'shadows')
    return 1 - smoothstep(96 - feather, 96 + feather, value);
  if (range === 'highlights')
    return smoothstep(160 - feather, 160 + feather, value);
  const shadowEdge = smoothstep(64 - feather / 2, 128, value),
    highlightEdge = 1 - smoothstep(128, 192 + feather / 2, value);
  return Math.max(0, Math.min(1, shadowEdge * highlightEdge * 1.5));
};

export const colorSimilarityWeight = (
  red: number,
  green: number,
  blue: number,
  target: readonly [number, number, number],
  tolerance: number,
) => {
  const distance =
      Math.abs(red - target[0]) +
      Math.abs(green - target[1]) +
      Math.abs(blue - target[2]),
    limit = Math.max(1, Math.min(255, tolerance)) * 3;
  return Math.max(0, Math.min(1, 1 - distance / limit));
};

export const focusWeight = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  threshold = 28,
) => {
  if (x < 1 || y < 1 || x >= width - 1 || y >= height - 1) return 0;
  const sample = (px: number, py: number) => {
      const index = (py * width + px) * 4;
      return pixelLuminance(
        pixels[index],
        pixels[index + 1],
        pixels[index + 2],
      );
    },
    horizontal = sample(x + 1, y) - sample(x - 1, y),
    vertical = sample(x, y + 1) - sample(x, y - 1),
    magnitude = Math.sqrt(horizontal * horizontal + vertical * vertical),
    floor = Math.max(1, Math.min(255, threshold));
  return Math.max(
    0,
    Math.min(1, (magnitude - floor) / Math.max(1, 255 - floor)),
  );
};
