const signatures = new Set(['8BIM', 'MeSa', 'AgHg', 'PHUT', 'DCSR']);
const text = (bytes: Uint8Array, offset: number) =>
  String.fromCharCode(...bytes.subarray(offset, offset + 4));

const section = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer),
    view = new DataView(buffer);
  if (bytes.length < 34 || text(bytes, 0) !== '8BPS')
    throw Error('Invalid PSD resource container.');
  const colorLength = view.getUint32(26, false),
    lengthOffset = 30 + colorLength;
  if (lengthOffset + 4 > bytes.length)
    throw Error('Truncated PSD color-mode data.');
  const length = view.getUint32(lengthOffset, false),
    start = lengthOffset + 4,
    end = start + length;
  if (end > bytes.length) throw Error('Truncated PSD image resources.');
  const blocks: { id: number; start: number; end: number }[] = [];
  for (let offset = start; offset < end;) {
    const blockStart = offset;
    if (offset + 12 > end || !signatures.has(text(bytes, offset)))
      throw Error('Malformed PSD image resource block.');
    const id = view.getUint16(offset + 4, false),
      nameBytes = bytes[offset + 6] + 1;
    offset += 6 + nameBytes + (nameBytes % 2);
    const size = view.getUint32(offset, false);
    offset += 4 + size + (size % 2);
    if (offset > end) throw Error('Truncated PSD image resource block.');
    blocks.push({ id, start: blockStart, end: offset });
  }
  return { bytes, lengthOffset, start, end, blocks };
};

/** Keep exact image-resource blocks so unsupported metadata is never discarded. */
export function extractPsdResources(buffer: ArrayBuffer) {
  const parsed = section(buffer);
  return parsed.blocks.map((block) =>
    parsed.bytes.slice(block.start, block.end),
  );
}

export function extractPsdResourcePayload(buffer: ArrayBuffer, id: number) {
  const parsed = section(buffer),
    match = parsed.blocks.find((block) => block.id === id);
  if (!match) return undefined;
  let offset = match.start + 6;
  const nameBytes = parsed.bytes[offset] + 1;
  offset += nameBytes + (nameBytes % 2);
  const size = new DataView(buffer).getUint32(offset, false);
  return parsed.bytes.slice(offset + 4, offset + 4 + size);
}

export function upsertPsdResource(
  buffer: ArrayBuffer,
  id: number,
  payload: Uint8Array | undefined,
) {
  if (!Number.isInteger(id) || id < 0 || id > 0xffff)
    throw Error('Invalid PSD resource ID.');
  const parsed = section(buffer),
    kept = parsed.blocks.filter((block) => block.id !== id),
    blockLength = payload ? 12 + payload.length + (payload.length % 2) : 0,
    resourceLength =
      kept.reduce((sum, block) => sum + block.end - block.start, 0) +
      blockLength,
    output = new Uint8Array(
      parsed.start + resourceLength + parsed.bytes.length - parsed.end,
    ),
    view = new DataView(output.buffer);
  output.set(parsed.bytes.subarray(0, parsed.lengthOffset));
  view.setUint32(parsed.lengthOffset, resourceLength, false);
  let offset = parsed.start;
  for (const block of kept) {
    output.set(parsed.bytes.subarray(block.start, block.end), offset);
    offset += block.end - block.start;
  }
  if (payload) {
    output.set(new TextEncoder().encode('8BIM'), offset);
    view.setUint16(offset + 4, id, false);
    view.setUint32(offset + 8, payload.length, false);
    output.set(payload, offset + 12);
    offset += blockLength;
  }
  output.set(parsed.bytes.subarray(parsed.end), offset);
  return output.buffer;
}

/** Add original blocks only when the new PSD writer did not already create that ID. */
export function mergeMissingPsdResources(
  buffer: ArrayBuffer,
  preserved: Uint8Array[] | undefined,
) {
  if (!preserved?.length) return buffer;
  const parsed = section(buffer),
    existing = new Set(parsed.blocks.map((block) => block.id)),
    missing = preserved.filter((block) => {
      if (block.length < 12 || !signatures.has(text(block, 0)))
        throw Error('Invalid preserved PSD resource.');
      return !existing.has(
        new DataView(block.buffer, block.byteOffset).getUint16(4, false),
      );
    }),
    added = missing.reduce((sum, block) => sum + block.length, 0);
  if (!added) return buffer;
  if (added > 32 * 1024 * 1024)
    throw Error('Preserved PSD metadata exceeds the 32 MB safety limit.');
  const output = new Uint8Array(parsed.bytes.length + added),
    view = new DataView(output.buffer);
  output.set(parsed.bytes.subarray(0, parsed.end), 0);
  let offset = parsed.end;
  for (const block of missing) {
    output.set(block, offset);
    offset += block.length;
  }
  output.set(parsed.bytes.subarray(parsed.end), offset);
  view.setUint32(parsed.lengthOffset, parsed.end - parsed.start + added, false);
  return output.buffer;
}

export const psdResourceToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return btoa(binary);
};

export const psdResourceFromBase64 = (value: string) => {
  if (!/^[a-z\d+/]*={0,2}$/i.test(value))
    throw Error('Invalid PSD resource encoding.');
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
};
