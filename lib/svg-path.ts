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
    closed = false;
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
      continue;
    }
    if (upper === 'H' || upper === 'V') {
      const value = read();
      if (upper === 'H') x = relative ? x + value : value;
      else y = relative ? y + value : value;
      anchors.push({ x, y, kind: 'corner' });
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

export const parseSvgDocument = (svg: string) => {
  if (!/<svg\b/i.test(svg)) throw Error('This file is not an SVG document');
  const paths: SvgVectorPath[] = [];
  for (const match of svg.matchAll(/<path\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (!attrs.d) continue;
    const parsed = parseSvgPathData(attrs.d),
      dash = (attrs['stroke-dasharray'] ?? '')
        .split(/[ ,]+/)
        .map(Number)
        .filter((item) => Number.isFinite(item) && item > 0),
      widthStart = number(
        attrs['data-librelayer-width-start'],
        number(attrs['stroke-width'], 4),
      ),
      widthEnd = number(attrs['data-librelayer-width-end'], widthStart);
    paths.push({
      name: attrs.id || attrs['aria-label'] || `SVG Path ${paths.length + 1}`,
      ...parsed,
      stroke: normalizePathStroke({
        color: attrs.stroke,
        widthStart,
        widthEnd,
        cap: attrs['stroke-linecap'] as CanvasLineCap,
        join: attrs['stroke-linejoin'] as CanvasLineJoin,
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
