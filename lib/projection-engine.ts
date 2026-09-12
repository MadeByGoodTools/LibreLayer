export type Point = { x: number; y: number };
export type Quad = [Point, Point, Point, Point];

export type VanishingPointRecipe = {
  plane: Quad;
  cloneOffsetX: number;
  cloneOffsetY: number;
  scale: number;
};

export type WideAngleRecipe = {
  focalLength: number;
  cropFactor: number;
  distortion: number;
  vertical: number;
  horizontal: number;
  rotation: number;
  scale: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

export const defaultVanishingPointRecipe = (): VanishingPointRecipe => ({
  plane: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ],
  cloneOffsetX: 0,
  cloneOffsetY: 0,
  scale: 1,
});

export const normalizeVanishingPointRecipe = (
  value?: Partial<VanishingPointRecipe>,
): VanishingPointRecipe => {
  const fallback = defaultVanishingPointRecipe(),
    source = Array.isArray(value?.plane) && value.plane.length === 4
      ? value.plane
      : fallback.plane;
  return {
    plane: source.map((point) => ({
      x: clamp(point?.x, -1, 2),
      y: clamp(point?.y, -1, 2),
    })) as Quad,
    cloneOffsetX: clamp(value?.cloneOffsetX ?? 0, -1, 1),
    cloneOffsetY: clamp(value?.cloneOffsetY ?? 0, -1, 1),
    scale: clamp(value?.scale ?? 1, 0.1, 4),
  };
};

export const defaultWideAngleRecipe = (): WideAngleRecipe => ({
  focalLength: 24,
  cropFactor: 1,
  distortion: 0,
  vertical: 0,
  horizontal: 0,
  rotation: 0,
  scale: 1,
});

export const normalizeWideAngleRecipe = (
  value?: Partial<WideAngleRecipe>,
): WideAngleRecipe => ({
  focalLength: clamp(value?.focalLength ?? 24, 4, 600),
  cropFactor: clamp(value?.cropFactor ?? 1, 0.1, 8),
  distortion: clamp(value?.distortion ?? 0, -100, 100),
  vertical: clamp(value?.vertical ?? 0, -100, 100),
  horizontal: clamp(value?.horizontal ?? 0, -100, 100),
  rotation: clamp(value?.rotation ?? 0, -180, 180),
  scale: clamp(value?.scale ?? 1, 0.1, 4),
});

const solve = (matrix: number[][], values: number[]) => {
  const rows = matrix.map((row, index) => [...row, values[index]]),
    count = values.length;
  for (let column = 0; column < count; column++) {
    let pivot = column;
    for (let row = column + 1; row < count; row++)
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column]))
        pivot = row;
    if (Math.abs(rows[pivot][column]) < 1e-10)
      throw new Error('The perspective plane is degenerate.');
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    const divisor = rows[column][column];
    for (let at = column; at <= count; at++) rows[column][at] /= divisor;
    for (let row = 0; row < count; row++) {
      if (row === column) continue;
      const factor = rows[row][column];
      for (let at = column; at <= count; at++)
        rows[row][at] -= factor * rows[column][at];
    }
  }
  return rows.map((row) => row[count]);
};

export const homographyFromUnitSquare = (quad: Quad) => {
  const destinations: Quad = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    matrix: number[][] = [],
    values: number[] = [];
  for (let index = 0; index < 4; index++) {
    const { x, y } = destinations[index],
      { x: u, y: v } = quad[index];
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    values.push(u);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    values.push(v);
  }
  return solve(matrix, values);
};

export const projectPoint = (matrix: number[], x: number, y: number) => {
  const denominator = matrix[6] * x + matrix[7] * y + 1;
  if (Math.abs(denominator) < 1e-8)
    return { x: Number.NaN, y: Number.NaN };
  return {
    x: (matrix[0] * x + matrix[1] * y + matrix[2]) / denominator,
    y: (matrix[3] * x + matrix[4] * y + matrix[5]) / denominator,
  };
};

export const vanishingPointSourcePoint = (
  x: number,
  y: number,
  width: number,
  height: number,
  value?: Partial<VanishingPointRecipe>,
) => createVanishingPointMapper(width, height, value)(x, y);

export const createVanishingPointMapper = (
  width: number,
  height: number,
  value?: Partial<VanishingPointRecipe>,
) => {
  const recipe = normalizeVanishingPointRecipe(value),
    matrix = homographyFromUnitSquare(recipe.plane),
    scale = recipe.scale;
  return (x: number, y: number) => {
    const nx = (x / Math.max(1, width - 1) - 0.5) / scale + 0.5,
      ny = (y / Math.max(1, height - 1) - 0.5) / scale + 0.5,
      projected = projectPoint(
        matrix,
        nx + recipe.cloneOffsetX,
        ny + recipe.cloneOffsetY,
      );
    return {
      x: projected.x * Math.max(1, width - 1),
      y: projected.y * Math.max(1, height - 1),
    };
  };
};

export const wideAngleSourcePoint = (
  x: number,
  y: number,
  width: number,
  height: number,
  value?: Partial<WideAngleRecipe>,
) => createWideAngleMapper(width, height, value)(x, y);

export const createWideAngleMapper = (
  width: number,
  height: number,
  value?: Partial<WideAngleRecipe>,
) => {
  const recipe = normalizeWideAngleRecipe(value),
    cx = (width - 1) / 2,
    cy = (height - 1) / 2,
    unit = Math.max(1, Math.min(width, height) / 2),
    angle = (-recipe.rotation * Math.PI) / 180,
    cosine = Math.cos(angle),
    focalWeight = clamp(24 / (recipe.focalLength * recipe.cropFactor), 0.04, 6),
    sine = Math.sin(angle);
  return (x: number, y: number) => {
    const dx = (x - cx) / unit / recipe.scale,
      dy = (y - cy) / unit / recipe.scale,
      rotatedX = dx * cosine - dy * sine,
      rotatedY = dx * sine + dy * cosine,
      radiusSquared = rotatedX * rotatedX + rotatedY * rotatedY,
      radial =
        1 +
        (recipe.distortion / 100) * focalWeight * radiusSquared * 0.55,
      perspectiveX =
        rotatedX * radial +
        (recipe.horizontal / 100) * rotatedY * rotatedY * 0.35,
      perspectiveY =
        rotatedY * radial +
        (recipe.vertical / 100) * rotatedX * rotatedX * 0.35;
    return { x: cx + perspectiveX * unit, y: cy + perspectiveY * unit };
  };
};

const bilinear = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  channel: number,
) => {
  if (x < 0 || y < 0 || x > width - 1 || y > height - 1) return 0;
  const x0 = Math.floor(x),
    y0 = Math.floor(y),
    x1 = Math.min(width - 1, x0 + 1),
    y1 = Math.min(height - 1, y0 + 1),
    fx = x - x0,
    fy = y - y0,
    at = (px: number, py: number) => pixels[(py * width + px) * 4 + channel];
  return Math.round(
    at(x0, y0) * (1 - fx) * (1 - fy) +
      at(x1, y0) * fx * (1 - fy) +
      at(x0, y1) * (1 - fx) * fy +
      at(x1, y1) * fx * fy,
  );
};

export const remapProjectionPixels = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  sourcePoint: (x: number, y: number) => Point,
) => {
  if (pixels.length !== width * height * 4)
    throw new Error('Projection pixels do not match their dimensions.');
  const output = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const source = sourcePoint(x, y),
        index = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel++)
        output[index + channel] = bilinear(
          pixels,
          width,
          height,
          source.x,
          source.y,
          channel,
        );
    }
  return output;
};
