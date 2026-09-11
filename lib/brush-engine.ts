export type StrokePoint = { x: number; y: number };
export type BrushSymmetry = 'none' | 'vertical' | 'horizontal' | 'radial';

export function interpolateStrokeDabs(
  start: StrokePoint,
  end: StrokePoint,
  spacing: number,
  distanceSinceLastDab: number,
) {
  const safeSpacing = Math.max(0.25, spacing),
    dx = end.x - start.x,
    dy = end.y - start.y,
    distance = Math.hypot(dx, dy),
    carried = Math.max(0, distanceSinceLastDab),
    points: StrokePoint[] = [];
  if (distance === 0) {
    if (carried >= safeSpacing) points.push({ ...start });
    return { points, distanceSinceLastDab: carried % safeSpacing };
  }
  let at = carried >= safeSpacing ? 0 : safeSpacing - carried;
  while (at <= distance) {
    const ratio = at / distance;
    points.push({ x: start.x + dx * ratio, y: start.y + dy * ratio });
    at += safeSpacing;
  }
  return {
    points,
    distanceSinceLastDab: (carried + distance) % safeSpacing,
  };
}

export function symmetryStrokePoints(
  point: StrokePoint,
  width: number,
  height: number,
  mode: BrushSymmetry,
  radialCount = 6,
) {
  if (mode === 'none') return [{ ...point }];
  if (mode === 'vertical')
    return [{ ...point }, { x: width - point.x, y: point.y }];
  if (mode === 'horizontal')
    return [{ ...point }, { x: point.x, y: height - point.y }];
  const count = Math.max(2, Math.min(16, Math.round(radialCount))),
    centerX = width / 2,
    centerY = height / 2,
    dx = point.x - centerX,
    dy = point.y - centerY;
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2,
      cosine = Math.cos(angle),
      sine = Math.sin(angle);
    return {
      x: centerX + dx * cosine - dy * sine,
      y: centerY + dx * sine + dy * cosine,
    };
  });
}
