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
export type PathStrokeStyle = {
  color: string;
  widthStart: number;
  widthEnd: number;
  cap: CanvasLineCap;
  join: CanvasLineJoin;
  dash: number[];
};

export const defaultPathStroke = (): PathStrokeStyle => ({
  color: '#ffffff',
  widthStart: 4,
  widthEnd: 4,
  cap: 'round',
  join: 'round',
  dash: [],
});

export const normalizePathStroke = (
  value?: Partial<PathStrokeStyle>,
): PathStrokeStyle => ({
  color:
    typeof value?.color === 'string' && /^#[0-9a-f]{6}$/i.test(value.color)
      ? value.color
      : '#ffffff',
  widthStart: Math.max(0.1, Math.min(1000, value?.widthStart ?? 4)),
  widthEnd: Math.max(0.1, Math.min(1000, value?.widthEnd ?? 4)),
  cap: ['butt', 'round', 'square'].includes(value?.cap ?? '')
    ? value!.cap!
    : 'round',
  join: ['round', 'bevel', 'miter'].includes(value?.join ?? '')
    ? value!.join!
    : 'round',
  dash: Array.isArray(value?.dash)
    ? value.dash
        .filter((item) => Number.isFinite(item) && item > 0)
        .slice(0, 12)
        .map((item) => Math.min(1000, item))
    : [],
});

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

export const anchorsToSvgPath = (anchors: BezierAnchor[], closed = true) => {
  if (anchors.length < 2) return '';
  let data = `M ${anchors[0].x} ${anchors[0].y}`;
  const segment = (previous: BezierAnchor, current: BezierAnchor) =>
    previous.outgoing || current.incoming
      ? ` C ${previous.outgoing?.x ?? previous.x} ${previous.outgoing?.y ?? previous.y} ${current.incoming?.x ?? current.x} ${current.incoming?.y ?? current.y} ${current.x} ${current.y}`
      : ` L ${current.x} ${current.y}`;
  for (let index = 1; index < anchors.length; index++)
    data += segment(anchors[index - 1], anchors[index]);
  if (closed) data += `${segment(anchors.at(-1)!, anchors[0])} Z`;
  return data;
};

export const sampleBezierAnchors = (
  anchors: BezierAnchor[],
  closed = true,
  stepsPerCurve = 16,
) => {
  if (anchors.length < 2) return [];
  const count = closed ? anchors.length : anchors.length - 1,
    points: VectorPoint[] = [{ x: anchors[0].x, y: anchors[0].y }];
  for (let segmentIndex = 0; segmentIndex < count; segmentIndex++) {
    const first = anchors[segmentIndex],
      second = anchors[(segmentIndex + 1) % anchors.length],
      firstHandle = first.outgoing ?? first,
      secondHandle = second.incoming ?? second,
      curved = Boolean(first.outgoing || second.incoming),
      steps = curved ? Math.max(2, Math.min(64, stepsPerCurve)) : 1;
    for (let step = 1; step <= steps; step++) {
      const t = step / steps,
        inverse = 1 - t;
      points.push(
        curved
          ? {
              x:
                inverse ** 3 * first.x +
                3 * inverse ** 2 * t * firstHandle.x +
                3 * inverse * t ** 2 * secondHandle.x +
                t ** 3 * second.x,
              y:
                inverse ** 3 * first.y +
                3 * inverse ** 2 * t * firstHandle.y +
                3 * inverse * t ** 2 * secondHandle.y +
                t ** 3 * second.y,
            }
          : { x: second.x, y: second.y },
      );
    }
  }
  return points;
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
