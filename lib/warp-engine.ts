export type WarpMode =
  | 'skew'
  | 'distort'
  | 'perspective'
  | 'warp'
  | 'mesh'
  | 'split'
  | 'cylindrical'
  | 'puppet'
  | 'perspective-warp'
  | 'preset-warp';

export type WarpPreset = 'arc' | 'flag' | 'fisheye' | 'twist';

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const warpSourcePoint = (
  mode: WarpMode,
  x: number,
  y: number,
  width: number,
  height: number,
  horizontal: number,
  vertical: number,
  preset: WarpPreset = 'arc',
): [number, number] => {
  const amountX = clamp(horizontal / 100, -1, 1),
    amountY = clamp(vertical / 100, -1, 1),
    nx = x / Math.max(1, width - 1) - 0.5,
    ny = y / Math.max(1, height - 1) - 0.5;
  if (mode === 'skew')
    return [x - amountX * ny * width, y - amountY * nx * height];
  if (mode === 'distort')
    return [
      x - amountX * ny * width * (0.5 + nx),
      y - amountY * nx * height * (0.5 + ny),
    ];
  if (mode === 'perspective') {
    const scaleX = Math.max(0.2, 1 + amountX * ny * 1.6),
      scaleY = Math.max(0.2, 1 + amountY * nx * 1.6);
    return [
      (nx / scaleX + 0.5) * Math.max(1, width - 1),
      (ny / scaleY + 0.5) * Math.max(1, height - 1),
    ];
  }
  if (mode === 'warp')
    return [
      x - Math.sin((y / height) * Math.PI) * amountX * width * 0.22,
      y - Math.sin((x / width) * Math.PI) * amountY * height * 0.22,
    ];
  if (mode === 'mesh') {
    const cellX = Math.sin(nx * Math.PI * 4) * Math.cos(ny * Math.PI * 2),
      cellY = Math.sin(ny * Math.PI * 4) * Math.cos(nx * Math.PI * 2);
    return [
      x - cellX * amountX * width * 0.08,
      y - cellY * amountY * height * 0.08,
    ];
  }
  if (mode === 'split') {
    const blend = Math.tanh(ny * 18),
      cross = Math.tanh(nx * 18);
    return [
      x - blend * amountX * width * 0.18,
      y - cross * amountY * height * 0.18,
    ];
  }
  if (mode === 'cylindrical') {
    const bowX = nx * (1 + amountX * (1 - 4 * ny * ny) * 0.7),
      bowY = ny * (1 + amountY * (1 - 4 * nx * nx) * 0.7);
    return [
      (bowX + 0.5) * Math.max(1, width - 1),
      (bowY + 0.5) * Math.max(1, height - 1),
    ];
  }
  if (mode === 'puppet') {
    const distance = Math.hypot(nx, ny),
      influence = Math.max(0, 1 - distance * 2);
    return [
      x - amountX * width * 0.35 * influence,
      y - amountY * height * 0.35 * influence,
    ];
  }
  if (mode === 'perspective-warp') {
    const scaleX = Math.max(0.2, 1 + amountX * ny * 1.8),
      scaleY = Math.max(0.2, 1 + amountY * nx * 1.8);
    return [
      (nx / scaleX + 0.5) * Math.max(1, width - 1),
      (ny / scaleY + 0.5) * Math.max(1, height - 1),
    ];
  }
  if (preset === 'flag')
    return [
      x - Math.sin(ny * Math.PI * 3) * amountX * width * 0.12,
      y - Math.sin(nx * Math.PI * 2) * amountY * height * 0.12,
    ];
  if (preset === 'fisheye') {
    const radius = Math.hypot(nx, ny),
      strength = 1 + amountX * Math.max(0, 1 - radius) * 0.9;
    return [
      (nx / Math.max(0.2, strength) + 0.5) * Math.max(1, width - 1),
      (ny / Math.max(0.2, strength) + 0.5) * Math.max(1, height - 1),
    ];
  }
  if (preset === 'twist') {
    const radius = Math.hypot(nx, ny),
      angle = amountX * Math.max(0, 1 - radius * 1.4) * Math.PI,
      cosine = Math.cos(angle),
      sine = Math.sin(angle);
    return [
      (nx * cosine - ny * sine + 0.5) * Math.max(1, width - 1),
      (nx * sine + ny * cosine + 0.5) * Math.max(1, height - 1),
    ];
  }
  return [
    x,
    y - Math.sin((x / width) * Math.PI) * amountX * height * 0.28 -
      amountY * height * nx * nx * 0.2,
  ];
};
