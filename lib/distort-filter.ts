export type DistortFilter =
  | 'lens-correction'
  | 'displace'
  | 'polar'
  | 'wave'
  | 'ripple'
  | 'spherize'
  | 'pixelate'
  | 'halftone';

const clamp = (value: number, maximum: number) =>
  Math.max(0, Math.min(maximum, value));

const sample = (
  source: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  channel: number,
) => {
  x = clamp(x, width - 1);
  y = clamp(y, height - 1);
  const x0 = Math.floor(x),
    y0 = Math.floor(y),
    x1 = Math.min(width - 1, x0 + 1),
    y1 = Math.min(height - 1, y0 + 1),
    fx = x - x0,
    fy = y - y0,
    top =
      source[(y0 * width + x0) * 4 + channel] * (1 - fx) +
      source[(y0 * width + x1) * 4 + channel] * fx,
    bottom =
      source[(y1 * width + x0) * 4 + channel] * (1 - fx) +
      source[(y1 * width + x1) * 4 + channel] * fx;
  return Math.round(top * (1 - fy) + bottom * fy);
};

export function applyDistortFilter(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  operation: DistortFilter,
  amount: number,
  secondary: number,
) {
  if (width < 1 || height < 1 || source.length !== width * height * 4)
    throw Error('Distort filter dimensions are invalid');
  const output = new Uint8ClampedArray(source.length),
    strength = Math.max(-1, Math.min(1, (amount - 50) / 50)),
    frequency = 2 + Math.round(Math.max(0, Math.min(100, secondary)) / 12),
    block = 2 + Math.round(Math.max(0, Math.min(100, amount)) / 5),
    cx = (width - 1) / 2,
    cy = (height - 1) / 2;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const target = (y * width + x) * 4;
      if (operation === 'halftone') {
        const cellX = Math.floor(x / block) * block + block / 2,
          cellY = Math.floor(y / block) * block + block / 2,
          center =
            (Math.min(height - 1, Math.floor(cellY)) * width +
              Math.min(width - 1, Math.floor(cellX))) *
            4,
          luma =
            source[center] * 0.2126 +
            source[center + 1] * 0.7152 +
            source[center + 2] * 0.0722,
          radius = (1 - luma / 255) * block * 0.7,
          inside = Math.hypot(x - cellX, y - cellY) <= radius;
        output[target] =
          output[target + 1] =
          output[target + 2] =
            inside ? 0 : 255;
        output[target + 3] = source[target + 3];
        continue;
      }
      let sx = x,
        sy = y;
      if (operation === 'pixelate') {
        sx = Math.floor(x / block) * block + block / 2;
        sy = Math.floor(y / block) * block + block / 2;
      } else {
        const nx = (x - cx) / Math.max(1, cx),
          ny = (y - cy) / Math.max(1, cy),
          radius = Math.hypot(nx, ny),
          angle = Math.atan2(ny, nx);
        if (operation === 'lens-correction') {
          const factor = 1 + strength * radius * radius * 0.55;
          sx = cx + (x - cx) * factor;
          sy = cy + (y - cy) * factor;
        } else if (operation === 'displace') {
          sx =
            x +
            Math.sin((y / Math.max(1, height - 1)) * Math.PI * frequency) *
              strength *
              width *
              0.05;
          sy =
            y +
            Math.cos((x / Math.max(1, width - 1)) * Math.PI * frequency) *
              strength *
              height *
              0.05;
        } else if (operation === 'polar') {
          sx = ((angle + Math.PI) / (Math.PI * 2)) * (width - 1);
          sy = clamp(radius, 1) * (height - 1);
        } else if (operation === 'wave') {
          sx =
            x +
            Math.sin((y / Math.max(1, height - 1)) * Math.PI * frequency) *
              strength *
              width *
              0.035;
        } else if (operation === 'ripple') {
          const shifted =
            radius +
            Math.sin(radius * frequency * Math.PI * 2) * strength * 0.045;
          sx = cx + Math.cos(angle) * shifted * cx;
          sy = cy + Math.sin(angle) * shifted * cy;
        } else if (operation === 'spherize' && radius < 1) {
          const shifted = radius ** (1 + strength * 0.7);
          sx = cx + Math.cos(angle) * shifted * cx;
          sy = cy + Math.sin(angle) * shifted * cy;
        }
      }
      for (let channel = 0; channel < 4; channel++)
        output[target + channel] = sample(
          source,
          width,
          height,
          sx,
          sy,
          channel,
        );
    }
  return output;
}
