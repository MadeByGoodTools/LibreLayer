import { remapProjectionPixels } from './projection-engine.ts';

export type LiquifyTool =
  | 'forward'
  | 'reconstruct'
  | 'twirl'
  | 'pucker'
  | 'bloat'
  | 'push'
  | 'freeze'
  | 'thaw';

export type LiquifyMesh = {
  version: 1;
  width: number;
  height: number;
  columns: number;
  rows: number;
  dx: number[];
  dy: number[];
  frozen: number[];
};

export type LiquifyFaceControls = {
  eyeSize: number;
  eyeHeight: number;
  noseWidth: number;
  smile: number;
  mouthHeight: number;
  jawline: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

export const createLiquifyMesh = (
  width: number,
  height: number,
  columns = 25,
  rows = 25,
): LiquifyMesh => {
  const safeWidth = Math.max(1, Math.floor(width)),
    safeHeight = Math.max(1, Math.floor(height)),
    safeColumns = Math.max(4, Math.min(65, Math.floor(columns))),
    safeRows = Math.max(4, Math.min(65, Math.floor(rows))),
    length = safeColumns * safeRows;
  return {
    version: 1,
    width: safeWidth,
    height: safeHeight,
    columns: safeColumns,
    rows: safeRows,
    dx: Array(length).fill(0),
    dy: Array(length).fill(0),
    frozen: Array(length).fill(0),
  };
};

export const isLiquifyMesh = (
  value: unknown,
  width?: number,
  height?: number,
): value is LiquifyMesh => {
  if (!value || typeof value !== 'object') return false;
  const mesh = value as Partial<LiquifyMesh>,
    columns = Number(mesh.columns),
    rows = Number(mesh.rows),
    length = columns * rows;
  return (
    mesh.version === 1 &&
    Number.isInteger(mesh.width) &&
    Number.isInteger(mesh.height) &&
    Number(mesh.width) > 0 &&
    Number(mesh.height) > 0 &&
    (width === undefined || mesh.width === width) &&
    (height === undefined || mesh.height === height) &&
    Number.isInteger(columns) &&
    Number.isInteger(rows) &&
    columns >= 4 &&
    columns <= 65 &&
    rows >= 4 &&
    rows <= 65 &&
    [mesh.dx, mesh.dy, mesh.frozen].every(
      (field) =>
        Array.isArray(field) &&
        field.length === length &&
        field.every(Number.isFinite),
    )
  );
};

export const normalizeLiquifyMesh = (
  value: LiquifyMesh,
  width = value?.width,
  height = value?.height,
) => {
  const fallback = createLiquifyMesh(width, height, value?.columns, value?.rows);
  if (!isLiquifyMesh(value, fallback.width, fallback.height))
    return fallback;
  return {
    ...fallback,
    dx: value.dx.map((item) => clamp(item, -fallback.width, fallback.width)),
    dy: value.dy.map((item) => clamp(item, -fallback.height, fallback.height)),
    frozen: value.frozen.map((item) => clamp(item, 0, 1)),
  };
};

export const resizeLiquifyMesh = (
  input: LiquifyMesh,
  width: number,
  height: number,
) => {
  const mesh = normalizeLiquifyMesh(input),
    next = normalizeLiquifyMesh(
      {
        ...mesh,
        width: Math.max(1, Math.floor(width)),
        height: Math.max(1, Math.floor(height)),
      },
      width,
      height,
    ),
    scaleX = next.width / mesh.width,
    scaleY = next.height / mesh.height;
  next.dx = mesh.dx.map((value) => value * scaleX);
  next.dy = mesh.dy.map((value) => value * scaleY);
  next.frozen = [...mesh.frozen];
  return next;
};

const smoothInfluence = (distance: number, radius: number, pressure: number) => {
  if (distance >= radius) return 0;
  const normalized = 1 - distance / Math.max(1, radius);
  return normalized * normalized * (3 - 2 * normalized) * pressure;
};

export const applyLiquifyStroke = (
  input: LiquifyMesh,
  tool: LiquifyTool,
  point: { x: number; y: number },
  drag: { x: number; y: number },
  radius: number,
  pressure = 0.5,
) => {
  const mesh = normalizeLiquifyMesh(input),
    next: LiquifyMesh = {
      ...mesh,
      dx: [...mesh.dx],
      dy: [...mesh.dy],
      frozen: [...mesh.frozen],
    },
    safeRadius = clamp(radius, 1, Math.max(mesh.width, mesh.height)),
    safePressure = clamp(pressure, 0.01, 1);
  for (let row = 0; row < mesh.rows; row++)
    for (let column = 0; column < mesh.columns; column++) {
      const index = row * mesh.columns + column,
        x = (column / (mesh.columns - 1)) * (mesh.width - 1),
        y = (row / (mesh.rows - 1)) * (mesh.height - 1),
        offsetX = x - point.x,
        offsetY = y - point.y,
        distance = Math.hypot(offsetX, offsetY),
        influence = smoothInfluence(distance, safeRadius, safePressure);
      if (!influence) continue;
      if (tool === 'freeze' || tool === 'thaw') {
        next.frozen[index] = clamp(
          next.frozen[index] + (tool === 'freeze' ? influence : -influence),
          0,
          1,
        );
        continue;
      }
      const available = influence * (1 - mesh.frozen[index]);
      if (!available) continue;
      if (tool === 'reconstruct') {
        next.dx[index] *= 1 - available;
        next.dy[index] *= 1 - available;
      } else if (tool === 'forward' || tool === 'push') {
        const sideways = tool === 'push';
        next.dx[index] += (sideways ? -drag.y : drag.x) * available;
        next.dy[index] += (sideways ? drag.x : drag.y) * available;
      } else if (tool === 'twirl') {
        const angle = available * 0.22,
          cosine = Math.cos(angle),
          sine = Math.sin(angle);
        next.dx[index] += offsetX * cosine - offsetY * sine - offsetX;
        next.dy[index] += offsetX * sine + offsetY * cosine - offsetY;
      } else {
        const direction = tool === 'bloat' ? 1 : -1,
          length = Math.max(1, distance),
          amount = direction * safeRadius * available * 0.08;
        next.dx[index] += (offsetX / length) * amount;
        next.dy[index] += (offsetY / length) * amount;
      }
    }
  return next;
};

const sampleField = (
  mesh: LiquifyMesh,
  field: number[],
  x: number,
  y: number,
) => {
  const gx = clamp((x / Math.max(1, mesh.width - 1)) * (mesh.columns - 1), 0, mesh.columns - 1),
    gy = clamp((y / Math.max(1, mesh.height - 1)) * (mesh.rows - 1), 0, mesh.rows - 1),
    x0 = Math.floor(gx),
    y0 = Math.floor(gy),
    x1 = Math.min(mesh.columns - 1, x0 + 1),
    y1 = Math.min(mesh.rows - 1, y0 + 1),
    fx = gx - x0,
    fy = gy - y0,
    at = (column: number, row: number) => field[row * mesh.columns + column];
  return (
    at(x0, y0) * (1 - fx) * (1 - fy) +
    at(x1, y0) * fx * (1 - fy) +
    at(x0, y1) * (1 - fx) * fy +
    at(x1, y1) * fx * fy
  );
};

const liquifySourcePointFromNormalizedMesh = (
  mesh: LiquifyMesh,
  x: number,
  y: number,
) => {
  return {
    x: x - sampleField(mesh, mesh.dx, x, y),
    y: y - sampleField(mesh, mesh.dy, x, y),
  };
};

export const liquifySourcePoint = (input: LiquifyMesh, x: number, y: number) =>
  liquifySourcePointFromNormalizedMesh(normalizeLiquifyMesh(input), x, y);

const faceDefaults: LiquifyFaceControls = {
  eyeSize: 0,
  eyeHeight: 0,
  noseWidth: 0,
  smile: 0,
  mouthHeight: 0,
  jawline: 0,
};

export const applyLiquifyFaceControls = (
  input: LiquifyMesh,
  value?: Partial<LiquifyFaceControls>,
) => {
  const controls = { ...faceDefaults, ...value },
    mesh = normalizeLiquifyMesh(input),
    radius = Math.min(mesh.width, mesh.height) * 0.13;
  let next = mesh;
  const apply = (
    tool: LiquifyTool,
    x: number,
    y: number,
    amountX: number,
    amountY: number,
    size = radius,
  ) => {
    const magnitude = Math.max(Math.abs(amountX), Math.abs(amountY));
    if (magnitude < 0.001) return;
    next = applyLiquifyStroke(
      next,
      tool,
      { x: x * mesh.width, y: y * mesh.height },
      { x: amountX * 0.12, y: amountY * 0.12 },
      size,
      clamp(magnitude / 100, 0.01, 1),
    );
  };
  const radialTool = (value: number, expand: LiquifyTool, contract: LiquifyTool) =>
    value >= 0 ? expand : contract;
  apply(radialTool(controls.eyeSize, 'bloat', 'pucker'), 0.36, 0.39, controls.eyeSize, 0);
  apply(radialTool(controls.eyeSize, 'bloat', 'pucker'), 0.64, 0.39, controls.eyeSize, 0);
  apply('forward', 0.36, 0.39, 0, controls.eyeHeight);
  apply('forward', 0.64, 0.39, 0, controls.eyeHeight);
  apply(radialTool(controls.noseWidth, 'bloat', 'pucker'), 0.5, 0.55, controls.noseWidth, 0, radius * 0.85);
  apply('forward', 0.39, 0.69, 0, -controls.smile);
  apply('forward', 0.61, 0.69, 0, -controls.smile);
  apply('forward', 0.5, 0.7, 0, controls.mouthHeight);
  apply(radialTool(controls.jawline, 'bloat', 'pucker'), 0.5, 0.82, controls.jawline, 0, radius * 1.8);
  return next;
};

export const renderLiquifyPixels = (
  pixels: Uint8ClampedArray,
  input: LiquifyMesh,
) => {
  const mesh = normalizeLiquifyMesh(input);
  return remapProjectionPixels(pixels, mesh.width, mesh.height, (x, y) =>
    liquifySourcePointFromNormalizedMesh(mesh, x, y),
  );
};
