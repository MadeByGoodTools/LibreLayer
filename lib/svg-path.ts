import {
  anchorsToSvgPath,
  defaultPathStroke,
  normalizePathStroke,
  type BezierAnchor,
  type PathStrokeStyle,
} from './path-engine.ts';

export type SvgVectorPath = {
  name: string;
  anchors: BezierAnchor[];
  closed: boolean;
  stroke: PathStrokeStyle;
};

const number = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const parseSvgPathData = (data: string) => {
  const tokens =
      data.match(/[a-zA-Z]|[-+]?(?:\d*\.?\d+)(?:e[-+]?\d+)?/gi) ?? [],
    anchors: BezierAnchor[] = [];
  let index = 0,
    command = '',
    x = 0,
    y = 0,
    closed = false,
    previousCubic: { x: number; y: number } | undefined,
    previousQuadratic: { x: number; y: number } | undefined;
  const read = () => {
      const value = Number(tokens[index++]);
      if (!Number.isFinite(value)) throw Error('Invalid SVG path coordinate');
      return value;
    },
    point = (relative: boolean) => {
      const nextX = read(),
        nextY = read();
      return {
        x: relative ? x + nextX : nextX,
        y: relative ? y + nextY : nextY,
      };
    };
  while (index < tokens.length) {
    if (/^[a-z]$/i.test(tokens[index])) command = tokens[index++];
    if (!command) throw Error('SVG path command is missing');
    const relative = command === command.toLowerCase(),
      upper = command.toUpperCase();
    if (upper === 'Z') {
      closed = true;
      command = '';
      previousCubic = previousQuadratic = undefined;
      continue;
    }
    if (upper === 'M' || upper === 'L') {
      const next = point(relative);
      if (upper === 'M' && anchors.length)
        throw Error('Split SVG subpaths into separate path elements');
      x = next.x;
      y = next.y;
      anchors.push({ x, y, kind: 'corner' });
      if (upper === 'M') command = relative ? 'l' : 'L';
      previousCubic = previousQuadratic = undefined;
      continue;
    }
    if (upper === 'H' || upper === 'V') {
      const value = read();
      if (upper === 'H') x = relative ? x + value : value;
      else y = relative ? y + value : value;
      anchors.push({ x, y, kind: 'corner' });
      previousCubic = previousQuadratic = undefined;
      continue;
    }
    if (upper === 'C') {
      if (!anchors.length) throw Error('SVG curve needs a starting point');
      const first = point(relative),
        second = point(relative),
        end = point(relative),
        previous = anchors.at(-1)!;
      previous.outgoing = first;
      previous.kind = 'smooth';
      x = end.x;
      y = end.y;
      anchors.push({ ...end, kind: 'smooth', incoming: second });
      previousCubic = second;
      previousQuadratic = undefined;
      continue;
    }
    if (upper === 'S') {
      if (!anchors.length) throw Error('SVG curve needs a starting point');
      const first = previousCubic
          ? { x: x * 2 - previousCubic.x, y: y * 2 - previousCubic.y }
          : { x, y },
        second = point(relative),
        end = point(relative),
        previous = anchors.at(-1)!;
      previous.outgoing = first;
      previous.kind = 'smooth';
      x = end.x;
      y = end.y;
      anchors.push({ ...end, kind: 'smooth', incoming: second });
      previousCubic = second;
      previousQuadratic = undefined;
      continue;
    }
    if (upper === 'Q') {
      if (!anchors.length) throw Error('SVG curve needs a starting point');
      const control = point(relative),
        end = point(relative),
        previous = anchors.at(-1)!;
      previous.outgoing = {
        x: previous.x + ((control.x - previous.x) * 2) / 3,
        y: previous.y + ((control.y - previous.y) * 2) / 3,
      };
      previous.kind = 'smooth';
      x = end.x;
      y = end.y;
      anchors.push({
        ...end,
        kind: 'smooth',
        incoming: {
          x: end.x + ((control.x - end.x) * 2) / 3,
          y: end.y + ((control.y - end.y) * 2) / 3,
        },
      });
      previousQuadratic = control;
      previousCubic = undefined;
      continue;
    }
    if (upper === 'T') {
      if (!anchors.length) throw Error('SVG curve needs a starting point');
      const control = previousQuadratic
          ? { x: x * 2 - previousQuadratic.x, y: y * 2 - previousQuadratic.y }
          : { x, y },
        end = point(relative),
        previous = anchors.at(-1)!;
      previous.outgoing = {
        x: previous.x + ((control.x - previous.x) * 2) / 3,
        y: previous.y + ((control.y - previous.y) * 2) / 3,
      };
      previous.kind = 'smooth';
      x = end.x;
      y = end.y;
      anchors.push({
        ...end,
        kind: 'smooth',
        incoming: {
          x: end.x + ((control.x - end.x) * 2) / 3,
          y: end.y + ((control.y - end.y) * 2) / 3,
        },
      });
      previousQuadratic = control;
      previousCubic = undefined;
      continue;
    }
    if (upper === 'A') {
      if (!anchors.length) throw Error('SVG arc needs a starting point');
      let rx = Math.abs(read()),
        ry = Math.abs(read());
      const rotation = (read() * Math.PI) / 180,
        largeArc = read() !== 0,
        sweep = read() !== 0,
        end = point(relative);
      if (!rx || !ry || (end.x === x && end.y === y)) {
        x = end.x;
        y = end.y;
        anchors.push({ ...end, kind: 'corner' });
        previousCubic = previousQuadratic = undefined;
        continue;
      }
      const cosine = Math.cos(rotation),
        sine = Math.sin(rotation),
        dx = (x - end.x) / 2,
        dy = (y - end.y) / 2,
        xPrime = cosine * dx + sine * dy,
        yPrime = -sine * dx + cosine * dy,
        radiusScale = xPrime ** 2 / rx ** 2 + yPrime ** 2 / ry ** 2;
      if (radiusScale > 1) {
        const scale = Math.sqrt(radiusScale);
        rx *= scale;
        ry *= scale;
      }
      const numerator = Math.max(
          0,
          rx ** 2 * ry ** 2 - rx ** 2 * yPrime ** 2 - ry ** 2 * xPrime ** 2,
        ),
        denominator = rx ** 2 * yPrime ** 2 + ry ** 2 * xPrime ** 2,
        sign = largeArc === sweep ? -1 : 1,
        factor = denominator ? sign * Math.sqrt(numerator / denominator) : 0,
        centerPrimeX = factor * ((rx * yPrime) / ry),
        centerPrimeY = factor * (-(ry * xPrime) / rx),
        centerX = cosine * centerPrimeX - sine * centerPrimeY + (x + end.x) / 2,
        centerY = sine * centerPrimeX + cosine * centerPrimeY + (y + end.y) / 2,
        angle = (ux: number, uy: number, vx: number, vy: number) =>
          Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy),
        startVectorX = (xPrime - centerPrimeX) / rx,
        startVectorY = (yPrime - centerPrimeY) / ry,
        endVectorX = (-xPrime - centerPrimeX) / rx,
        endVectorY = (-yPrime - centerPrimeY) / ry;
      const startAngle = angle(1, 0, startVectorX, startVectorY);
      let delta = angle(startVectorX, startVectorY, endVectorX, endVectorY);
      if (!sweep && delta > 0) delta -= Math.PI * 2;
      if (sweep && delta < 0) delta += Math.PI * 2;
      const segments = Math.ceil(Math.abs(delta) / (Math.PI / 2)),
        step = delta / segments,
        ellipsePoint = (theta: number) => ({
          x:
            centerX +
            rx * Math.cos(theta) * cosine -
            ry * Math.sin(theta) * sine,
          y:
            centerY +
            rx * Math.cos(theta) * sine +
            ry * Math.sin(theta) * cosine,
        }),
        ellipseDerivative = (theta: number) => ({
          x: -rx * Math.sin(theta) * cosine - ry * Math.cos(theta) * sine,
          y: -rx * Math.sin(theta) * sine + ry * Math.cos(theta) * cosine,
        });
      for (let segment = 0; segment < segments; segment++) {
        const from = startAngle + segment * step,
          to = from + step,
          alpha = (4 / 3) * Math.tan(step / 4),
          fromPoint = ellipsePoint(from),
          toPoint = segment === segments - 1 ? end : ellipsePoint(to),
          fromDerivative = ellipseDerivative(from),
          toDerivative = ellipseDerivative(to),
          previous = anchors.at(-1)!;
        previous.outgoing = {
          x: fromPoint.x + alpha * fromDerivative.x,
          y: fromPoint.y + alpha * fromDerivative.y,
        };
        previous.kind = 'smooth';
        anchors.push({
          ...toPoint,
          kind: 'smooth',
          incoming: {
            x: toPoint.x - alpha * toDerivative.x,
            y: toPoint.y - alpha * toDerivative.y,
          },
        });
      }
      x = end.x;
      y = end.y;
      previousCubic = previousQuadratic = undefined;
      continue;
    }
    throw Error(`Unsupported SVG path command: ${command}`);
  }
  if (
    closed &&
    anchors.length > 1 &&
    anchors.at(-1)!.x === anchors[0].x &&
    anchors.at(-1)!.y === anchors[0].y
  ) {
    const closing = anchors.pop()!;
    if (closing.incoming) {
      anchors[0].incoming = closing.incoming;
      anchors[0].kind = 'smooth';
    }
  }
  if (anchors.length < 2) throw Error('SVG path needs at least two anchors');
  return { anchors, closed };
};

const attributes = (tag: string) => {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g))
    result[match[1]] = match[2];
  return result;
};

type Matrix = [number, number, number, number, number, number];
const multiplyMatrix = (left: Matrix, right: Matrix): Matrix => [
  left[0] * right[0] + left[2] * right[1],
  left[1] * right[0] + left[3] * right[1],
  left[0] * right[2] + left[2] * right[3],
  left[1] * right[2] + left[3] * right[3],
  left[0] * right[4] + left[2] * right[5] + left[4],
  left[1] * right[4] + left[3] * right[5] + left[5],
];
const transformMatrix = (value: string | undefined) => {
  let matrix: Matrix = [1, 0, 0, 1, 0, 0];
  for (const item of value?.matchAll(
    /(matrix|translate|scale|rotate)\s*\(([^)]*)\)/gi,
  ) ?? []) {
    const values = item[2].split(/[ ,]+/).filter(Boolean).map(Number);
    if (values.some((entry) => !Number.isFinite(entry)))
      throw Error('Invalid SVG transform');
    let next: Matrix;
    if (item[1].toLowerCase() === 'matrix' && values.length === 6)
      next = values as Matrix;
    else if (item[1].toLowerCase() === 'translate')
      next = [1, 0, 0, 1, values[0] ?? 0, values[1] ?? 0];
    else if (item[1].toLowerCase() === 'scale')
      next = [values[0] ?? 1, 0, 0, values[1] ?? values[0] ?? 1, 0, 0];
    else if (item[1].toLowerCase() === 'rotate') {
      const radians = ((values[0] ?? 0) * Math.PI) / 180,
        cosine = Math.cos(radians),
        sine = Math.sin(radians),
        cx = values[1] ?? 0,
        cy = values[2] ?? 0;
      next = multiplyMatrix(
        multiplyMatrix(
          [1, 0, 0, 1, cx, cy],
          [cosine, sine, -sine, cosine, 0, 0],
        ),
        [1, 0, 0, 1, -cx, -cy],
      );
    } else throw Error(`Unsupported SVG transform: ${item[1]}`);
    matrix = multiplyMatrix(matrix, next);
  }
  return matrix;
};
const transformPoint = (point: { x: number; y: number }, matrix: Matrix) => ({
  x: point.x * matrix[0] + point.y * matrix[2] + matrix[4],
  y: point.x * matrix[1] + point.y * matrix[3] + matrix[5],
});
const transformedAnchors = (anchors: BezierAnchor[], value?: string) => {
  const matrix = transformMatrix(value);
  return anchors.map((anchor) => ({
    ...anchor,
    ...transformPoint(anchor, matrix),
    incoming: anchor.incoming
      ? transformPoint(anchor.incoming, matrix)
      : undefined,
    outgoing: anchor.outgoing
      ? transformPoint(anchor.outgoing, matrix)
      : undefined,
  }));
};

const shapePath = (tag: string, attrs: Record<string, string>) => {
  const kind = tag.toLowerCase();
  if (kind === 'line')
    return {
      anchors: [
        {
          x: number(attrs.x1, 0),
          y: number(attrs.y1, 0),
          kind: 'corner' as const,
        },
        {
          x: number(attrs.x2, 0),
          y: number(attrs.y2, 0),
          kind: 'corner' as const,
        },
      ],
      closed: false,
    };
  if (kind === 'polyline' || kind === 'polygon') {
    const values = (attrs.points ?? '')
      .trim()
      .split(/[ ,]+/)
      .filter(Boolean)
      .map(Number);
    if (
      values.length < 4 ||
      values.length % 2 ||
      values.some((value) => !Number.isFinite(value))
    )
      throw Error('Invalid SVG polygon points');
    return {
      anchors: Array.from({ length: values.length / 2 }, (_, index) => ({
        x: values[index * 2],
        y: values[index * 2 + 1],
        kind: 'corner' as const,
      })),
      closed: kind === 'polygon',
    };
  }
  if (kind === 'rect') {
    const x = number(attrs.x, 0),
      y = number(attrs.y, 0),
      width = number(attrs.width, 0),
      height = number(attrs.height, 0);
    if (width <= 0 || height <= 0) throw Error('Invalid SVG rectangle');
    return {
      anchors: [
        { x, y, kind: 'corner' as const },
        { x: x + width, y, kind: 'corner' as const },
        { x: x + width, y: y + height, kind: 'corner' as const },
        { x, y: y + height, kind: 'corner' as const },
      ],
      closed: true,
    };
  }
  const cx = number(attrs.cx, 0),
    cy = number(attrs.cy, 0),
    rx = kind === 'circle' ? number(attrs.r, 0) : number(attrs.rx, 0),
    ry = kind === 'circle' ? rx : number(attrs.ry, 0),
    k = 0.5522847498307936;
  if (rx <= 0 || ry <= 0) throw Error('Invalid SVG ellipse');
  return {
    anchors: [
      {
        x: cx,
        y: cy - ry,
        kind: 'smooth' as const,
        incoming: { x: cx - rx * k, y: cy - ry },
        outgoing: { x: cx + rx * k, y: cy - ry },
      },
      {
        x: cx + rx,
        y: cy,
        kind: 'smooth' as const,
        incoming: { x: cx + rx, y: cy - ry * k },
        outgoing: { x: cx + rx, y: cy + ry * k },
      },
      {
        x: cx,
        y: cy + ry,
        kind: 'smooth' as const,
        incoming: { x: cx + rx * k, y: cy + ry },
        outgoing: { x: cx - rx * k, y: cy + ry },
      },
      {
        x: cx - rx,
        y: cy,
        kind: 'smooth' as const,
        incoming: { x: cx - rx, y: cy + ry * k },
        outgoing: { x: cx - rx, y: cy - ry * k },
      },
    ],
    closed: true,
  };
};

export const parseSvgDocument = (svg: string) => {
  if (!/<svg\b/i.test(svg)) throw Error('This file is not an SVG document');
  if (
    /<(?:script|foreignObject|iframe|object|embed)\b/i.test(svg) ||
    /\bon[a-z]+\s*=/i.test(svg) ||
    /(?:href|src)\s*=\s*["']\s*(?:javascript:|data:text\/html)/i.test(svg)
  )
    throw Error('Unsafe active SVG content is not supported');
  const paths: SvgVectorPath[] = [];
  for (const match of svg.matchAll(
    /<(path|rect|circle|ellipse|line|polyline|polygon)\b[^>]*>/gi,
  )) {
    const attrs = attributes(match[0]);
    const style = Object.fromEntries(
        (attrs.style ?? '')
          .split(';')
          .map((declaration) =>
            declaration.split(':').map((part) => part.trim()),
          )
          .filter((entry) => entry.length === 2 && entry[0]),
      ) as Record<string, string>,
      merged = { ...style, ...attrs },
      parsed =
        match[1].toLowerCase() === 'path'
          ? attrs.d
            ? parseSvgPathData(attrs.d)
            : undefined
          : shapePath(match[1], attrs);
    if (!parsed) continue;
    const anchors = transformedAnchors(parsed.anchors, attrs.transform),
      dash = (merged['stroke-dasharray'] ?? '')
        .split(/[ ,]+/)
        .map(Number)
        .filter((item) => Number.isFinite(item) && item > 0),
      widthStart = number(
        merged['data-librelayer-width-start'],
        number(merged['stroke-width'], 4),
      ),
      widthEnd = number(merged['data-librelayer-width-end'], widthStart);
    paths.push({
      name: attrs.id || attrs['aria-label'] || `SVG Path ${paths.length + 1}`,
      anchors,
      closed: parsed.closed,
      stroke: normalizePathStroke({
        color: merged.stroke,
        widthStart,
        widthEnd,
        cap: merged['stroke-linecap'] as CanvasLineCap,
        join: merged['stroke-linejoin'] as CanvasLineJoin,
        dash,
      }),
    });
    if (paths.length >= 512) break;
  }
  if (!paths.length) throw Error('No supported SVG path elements were found');
  return paths;
};

const escapeXml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[character]!,
  );

export const serializeSvgDocument = (
  paths: SvgVectorPath[],
  width: number,
  height: number,
) => {
  if (!paths.length || width < 1 || height < 1)
    throw Error('SVG export needs paths and positive dimensions');
  const body = paths
    .map((path) => {
      const stroke = normalizePathStroke(path.stroke ?? defaultPathStroke()),
        dash = stroke.dash.length
          ? ` stroke-dasharray="${stroke.dash.join(' ')}"`
          : '';
      return `  <path id="${escapeXml(path.name)}" d="${anchorsToSvgPath(path.anchors, path.closed)}" fill="none" stroke="${stroke.color}" stroke-width="${(stroke.widthStart + stroke.widthEnd) / 2}" stroke-linecap="${stroke.cap}" stroke-linejoin="${stroke.join}"${dash} data-librelayer-width-start="${stroke.widthStart}" data-librelayer-width-end="${stroke.widthEnd}" />`;
    })
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n${body}\n</svg>\n`;
};
