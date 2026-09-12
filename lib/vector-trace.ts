export type TracePoint = { x: number; y: number };

const key = (point: TracePoint) => `${point.x},${point.y}`;

const simplifyOrthogonal = (points: TracePoint[]) => {
  if (points.length < 4) return points;
  const result: TracePoint[] = [];
  for (let index = 0; index < points.length; index++) {
    const previous = points[(index - 1 + points.length) % points.length],
      current = points[index],
      next = points[(index + 1) % points.length],
      sameX = previous.x === current.x && current.x === next.x,
      sameY = previous.y === current.y && current.y === next.y;
    if (!sameX && !sameY) result.push(current);
  }
  return result;
};

export const traceAlphaContours = (
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = 24,
  maxPoints = 10_000,
) => {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    rgba.length !== width * height * 4
  )
    throw Error('Invalid trace pixels');
  const opaque = (x: number, y: number) =>
      x >= 0 &&
      y >= 0 &&
      x < width &&
      y < height &&
      rgba[(y * width + x) * 4 + 3] >= threshold,
    edges = new Map<string, TracePoint[]>(),
    add = (from: TracePoint, to: TracePoint) => {
      const list = edges.get(key(from)) ?? [];
      list.push(to);
      edges.set(key(from), list);
    };
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (!opaque(x, y)) continue;
      if (!opaque(x, y - 1)) add({ x, y }, { x: x + 1, y });
      if (!opaque(x + 1, y)) add({ x: x + 1, y }, { x: x + 1, y: y + 1 });
      if (!opaque(x, y + 1)) add({ x: x + 1, y: y + 1 }, { x, y: y + 1 });
      if (!opaque(x - 1, y)) add({ x, y: y + 1 }, { x, y });
    }
  const contours: TracePoint[][] = [];
  let usedPoints = 0;
  while (edges.size && usedPoints < maxPoints && contours.length < 512) {
    const [startKey] = edges.entries().next().value as [
        string,
        TracePoint[],
      ],
      [sx, sy] = startKey.split(',').map(Number),
      start = { x: sx, y: sy },
      contour = [start];
    let currentKey = startKey,
      guard = 0;
    while (guard++ < maxPoints) {
      const list = edges.get(currentKey);
      if (!list?.length) break;
      const next = list.shift()!;
      if (!list.length) edges.delete(currentKey);
      if (next.x === start.x && next.y === start.y) break;
      contour.push(next);
      currentKey = key(next);
    }
    const simplified = simplifyOrthogonal(contour);
    if (simplified.length >= 3 && usedPoints + simplified.length <= maxPoints) {
      contours.push(simplified);
      usedPoints += simplified.length;
    }
  }
  return contours;
};
