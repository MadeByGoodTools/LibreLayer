import type { BezierAnchor } from './path-engine.ts';

export type PortablePsdPath = {
  name: string;
  closed: boolean;
  anchors: BezierAnchor[];
};

const signatures = new Set(['8BIM', 'MeSa', 'AgHg', 'PHUT', 'DCSR']);
const text = (bytes: Uint8Array, offset: number, length = 4) =>
  String.fromCharCode(...bytes.subarray(offset, offset + length));
const section = (buffer: ArrayBuffer) => {
  const view = new DataView(buffer),
    colorLength = view.getUint32(26, false),
    lengthOffset = 30 + colorLength;
  if (lengthOffset + 4 > buffer.byteLength)
    throw Error('Truncated PSD resources.');
  const length = view.getUint32(lengthOffset, false),
    start = lengthOffset + 4,
    end = start + length;
  if (end > buffer.byteLength) throw Error('Truncated PSD resources.');
  return { lengthOffset, start, end };
};
const blocks = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer),
    view = new DataView(buffer),
    area = section(buffer),
    result: {
      id: number;
      name: string;
      start: number;
      dataStart: number;
      size: number;
      end: number;
    }[] = [];
  let offset = area.start;
  while (offset < area.end) {
    const start = offset;
    if (offset + 12 > area.end || !signatures.has(text(bytes, offset)))
      throw Error('Malformed PSD resource block.');
    const id = view.getUint16(offset + 4, false),
      nameLength = bytes[offset + 6],
      name = text(bytes, offset + 7, nameLength),
      nameBytes = nameLength + 1,
      paddedNameBytes = nameBytes + (nameBytes % 2);
    offset += 6 + paddedNameBytes;
    const size = view.getUint32(offset, false),
      dataStart = offset + 4,
      end = dataStart + size + (size % 2);
    if (end > area.end) throw Error('Truncated PSD resource data.');
    result.push({ id, name, start, dataStart, size, end });
    offset = end;
  }
  return { ...area, blocks: result };
};
const validPath = (path: PortablePsdPath, width: number, height: number) =>
  path.name.length > 0 &&
  path.name.length <= 255 &&
  path.anchors.length >= 2 &&
  path.anchors.length <= 10000 &&
  path.anchors.every((anchor) =>
    [
      anchor.x,
      anchor.y,
      anchor.incoming?.x,
      anchor.incoming?.y,
      anchor.outgoing?.x,
      anchor.outgoing?.y,
    ]
      .filter((value) => value !== undefined)
      .every(
        (value) =>
          Number.isFinite(value) &&
          Math.abs(value!) <= Math.max(width, height) * 16,
      ),
  );
const fixed = (value: number) => Math.round(value * 0x1000000);
const coordinate = (view: DataView, offset: number, value: number) =>
  view.setInt32(offset, fixed(value), false);

export function encodePsdPath(
  path: PortablePsdPath,
  width: number,
  height: number,
) {
  if (!validPath(path, width, height))
    throw Error('Invalid PSD path geometry.');
  const output = new Uint8Array((path.anchors.length + 2) * 26),
    view = new DataView(output.buffer);
  view.setUint16(0, 6, false);
  view.setUint16(26, path.closed ? 0 : 3, false);
  view.setUint16(28, path.anchors.length, false);
  path.anchors.forEach((anchor, index) => {
    const offset = (index + 2) * 26,
      incoming = anchor.incoming ?? anchor,
      outgoing = anchor.outgoing ?? anchor;
    view.setUint16(offset, path.closed ? 1 : 4, false);
    coordinate(view, offset + 2, incoming.y / height);
    coordinate(view, offset + 6, incoming.x / width);
    coordinate(view, offset + 10, anchor.y / height);
    coordinate(view, offset + 14, anchor.x / width);
    coordinate(view, offset + 18, outgoing.y / height);
    coordinate(view, offset + 22, outgoing.x / width);
  });
  return output;
}

export function decodePsdPath(
  data: Uint8Array,
  name: string,
  width: number,
  height: number,
): PortablePsdPath {
  if (data.length % 26) throw Error('Malformed PSD path records.');
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let closed = true,
    expected = -1;
  const anchors: BezierAnchor[] = [];
  for (let offset = 0; offset < data.length; offset += 26) {
    const selector = view.getUint16(offset, false);
    if (selector === 0 || selector === 3) {
      if (expected >= 0) throw Error('PSD path contains multiple subpaths.');
      closed = selector === 0;
      expected = view.getUint16(offset + 2, false);
    } else if ([1, 2, 4, 5].includes(selector)) {
      if (expected < 0) throw Error('PSD path knot has no subpath header.');
      const read = (at: number) =>
          view.getInt32(offset + at, false) / 0x1000000,
        incoming = { x: read(6) * width, y: read(2) * height },
        anchor = { x: read(14) * width, y: read(10) * height },
        outgoing = { x: read(22) * width, y: read(18) * height };
      anchors.push({
        ...anchor,
        kind: selector === 1 || selector === 4 ? 'smooth' : 'corner',
        ...(incoming.x !== anchor.x || incoming.y !== anchor.y
          ? { incoming }
          : {}),
        ...(outgoing.x !== anchor.x || outgoing.y !== anchor.y
          ? { outgoing }
          : {}),
      });
    } else if (![6, 7, 8].includes(selector))
      throw Error(`Unsupported PSD path record ${selector}.`);
  }
  const result = { name: name || 'Work Path', closed, anchors };
  if (expected !== anchors.length || !validPath(result, width, height))
    throw Error('Malformed PSD path geometry.');
  return result;
}

export function extractPsdPaths(
  buffer: ArrayBuffer,
  width: number,
  height: number,
) {
  const bytes = new Uint8Array(buffer);
  return blocks(buffer)
    .blocks.filter((block) => block.id >= 2000 && block.id <= 2998)
    .map((block) =>
      decodePsdPath(
        bytes.slice(block.dataStart, block.dataStart + block.size),
        block.name,
        width,
        height,
      ),
    );
}

export function injectPsdPaths(
  buffer: ArrayBuffer,
  paths: PortablePsdPath[] | undefined,
  width: number,
  height: number,
) {
  if (!paths?.length) return buffer;
  if (paths.length > 512)
    throw Error('PSD path export supports up to 512 paths.');
  const bytes = new Uint8Array(buffer),
    area = blocks(buffer),
    kept = area.blocks.filter((block) => block.id < 2000 || block.id > 2998),
    encoded = paths.map((path, index) => {
      const data = encodePsdPath(path, width, height),
        name = new TextEncoder().encode(path.name);
      if (name.length > 255) throw Error('PSD path name is too long.');
      const nameSize = 1 + name.length,
        paddedNameSize = nameSize + (nameSize % 2),
        output = new Uint8Array(
          6 + paddedNameSize + 4 + data.length + (data.length % 2),
        ),
        view = new DataView(output.buffer);
      output.set([0x38, 0x42, 0x49, 0x4d]);
      view.setUint16(4, 2000 + index, false);
      output[6] = name.length;
      output.set(name, 7);
      view.setUint32(6 + paddedNameSize, data.length, false);
      output.set(data, 10 + paddedNameSize);
      return output;
    }),
    resourceLength =
      kept.reduce((sum, block) => sum + block.end - block.start, 0) +
      encoded.reduce((sum, data) => sum + data.length, 0),
    output = new Uint8Array(
      area.start + resourceLength + bytes.length - area.end,
    ),
    view = new DataView(output.buffer);
  output.set(bytes.subarray(0, area.lengthOffset));
  view.setUint32(area.lengthOffset, resourceLength, false);
  let offset = area.start;
  for (const block of kept) {
    output.set(bytes.subarray(block.start, block.end), offset);
    offset += block.end - block.start;
  }
  for (const data of encoded) {
    output.set(data, offset);
    offset += data.length;
  }
  output.set(bytes.subarray(area.end), offset);
  return output.buffer;
}
