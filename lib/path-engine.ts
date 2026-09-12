export type VectorPoint = { x: number; y: number };
export type BezierAnchor = VectorPoint & {
  kind: 'corner' | 'smooth';
  incoming?: VectorPoint;
  outgoing?: VectorPoint;
};
export type PathBooleanOperation =
  | 'union'
  | 'subtract'
  | 'intersect'
  | 'exclude';

export const anchorsFromPoints = (
  points: VectorPoint[],
  curved: boolean,
  tension = 50,
) => {
  const amount = Math.max(0, Math.min(100, tension)) / 600;
  return points.map<BezierAnchor>((point, index) => {
    if (!curved || points.length < 3) return { ...point, kind: 'corner' };
    const previous = points[(index - 1 + points.length) % points.length],
      next = points[(index + 1) % points.length],
      dx = (next.x - previous.x) * amount,
      dy = (next.y - previous.y) * amount;
    return {
      ...point,
      kind: 'smooth',
      incoming: { x: point.x - dx, y: point.y - dy },
      outgoing: { x: point.x + dx, y: point.y + dy },
    };
  });
};

export const convertAnchorKind = (
  anchors: BezierAnchor[],
  index: number,
  kind: BezierAnchor['kind'],
) => {
  if (!anchors[index]) return anchors;
  return anchors.map((anchor, anchorIndex) => {
    if (anchorIndex !== index) return { ...anchor };
    if (kind === 'corner')
      return { x: anchor.x, y: anchor.y, kind } as BezierAnchor;
    const previous = anchors[(index - 1 + anchors.length) % anchors.length],
      next = anchors[(index + 1) % anchors.length],
      dx = (next.x - previous.x) / 6,
      dy = (next.y - previous.y) / 6;
    return {
      x: anchor.x,
      y: anchor.y,
      kind,
      incoming: { x: anchor.x - dx, y: anchor.y - dy },
      outgoing: { x: anchor.x + dx, y: anchor.y + dy },
    };
  });
};

export const moveAnchor = (
  anchors: BezierAnchor[],
  index: number,
  x: number,
  y: number,
) =>
  anchors.map((anchor, anchorIndex) => {
    if (anchorIndex !== index) return { ...anchor };
    const dx = x - anchor.x,
      dy = y - anchor.y;
    return {
      ...anchor,
      x,
      y,
      incoming: anchor.incoming
        ? { x: anchor.incoming.x + dx, y: anchor.incoming.y + dy }
        : undefined,
      outgoing: anchor.outgoing
        ? { x: anchor.outgoing.x + dx, y: anchor.outgoing.y + dy }
        : undefined,
    };
  });

export const moveAnchorHandle = (
  anchors: BezierAnchor[],
  index: number,
  handle: 'incoming' | 'outgoing',
  x: number,
  y: number,
  mirror = true,
) =>
  anchors.map((anchor, anchorIndex) => {
    if (anchorIndex !== index) return { ...anchor };
    const opposite = handle === 'incoming' ? 'outgoing' : 'incoming';
    return {
      ...anchor,
      kind: mirror ? 'smooth' : anchor.kind,
      [handle]: { x, y },
      [opposite]: mirror
        ? { x: anchor.x * 2 - x, y: anchor.y * 2 - y }
        : anchor[opposite],
    };
  });

export const combinePathMasks = (
  first: Uint8ClampedArray,
  second: Uint8ClampedArray,
  operation: PathBooleanOperation,
) => {
  if (first.length !== second.length)
    throw Error('Path mask sizes do not match');
  const result = new Uint8ClampedArray(first.length);
  for (let index = 0; index < result.length; index++) {
    const a = first[index] / 255,
      b = second[index] / 255,
      value =
        operation === 'union'
          ? Math.max(a, b)
          : operation === 'intersect'
            ? Math.min(a, b)
            : operation === 'subtract'
              ? a * (1 - b)
              : Math.abs(a - b);
    result[index] = Math.round(value * 255);
  }
  return result;
};
