export type StrokePoint = { x: number; y: number };

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
