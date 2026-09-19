const ICC_RESOURCE_ID = 1039;
const MAX_ICC_BYTES = 4 * 1024 * 1024;
const RESOURCE_SIGNATURES = new Set(['8BIM', 'MeSa', 'AgHg', 'PHUT', 'DCSR']);

const signature = (bytes: Uint8Array, offset: number) =>
  String.fromCharCode(...bytes.subarray(offset, offset + 4));

const resourcesSection = (buffer: ArrayBuffer) => {
  if (buffer.byteLength < 34) throw Error('Incomplete PSD resource section.');
  const view = new DataView(buffer),
    colorLength = view.getUint32(26, false),
    lengthOffset = 30 + colorLength;
  if (lengthOffset + 4 > buffer.byteLength)
    throw Error('Truncated PSD color-mode data.');
  const length = view.getUint32(lengthOffset, false),
    start = lengthOffset + 4,
    end = start + length;
  if (end > buffer.byteLength) throw Error('Truncated PSD image resources.');
  return { lengthOffset, start, end };
};

const resourceBlocks = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer),
    view = new DataView(buffer),
    section = resourcesSection(buffer),
    blocks: {
      id: number;
      start: number;
      dataStart: number;
      size: number;
      end: number;
    }[] = [];
  let offset = section.start;
  while (offset < section.end) {
    const start = offset;
    if (
      offset + 11 > section.end ||
      !RESOURCE_SIGNATURES.has(signature(bytes, offset))
    )
      throw Error('Malformed PSD image resource block.');
    const id = view.getUint16(offset + 4, false),
      nameLength = bytes[offset + 6],
      nameBytes = nameLength + 1,
      paddedNameBytes = nameBytes + (nameBytes % 2);
    offset += 6 + paddedNameBytes;
    if (offset + 4 > section.end)
      throw Error('Truncated PSD image resource size.');
    const size = view.getUint32(offset, false),
      dataStart = offset + 4,
      end = dataStart + size + (size % 2);
    if (end > section.end) throw Error('Truncated PSD image resource data.');
    blocks.push({ id, start, dataStart, size, end });
    offset = end;
  }
  return { ...section, blocks };
};

export function validPsdIccProfile(profile: Uint8Array | undefined) {
  if (!profile) return true;
  if (profile.byteLength < 128 || profile.byteLength > MAX_ICC_BYTES)
    return false;
  const view = new DataView(
    profile.buffer,
    profile.byteOffset,
    profile.byteLength,
  );
  return (
    view.getUint32(0, false) >= 128 &&
    view.getUint32(0, false) <= profile.byteLength &&
    signature(profile, 36) === 'acsp'
  );
}

export function psdIccToBase64(profile: Uint8Array) {
  if (!validPsdIccProfile(profile)) throw Error('Invalid PSD ICC profile.');
  let binary = '';
  for (let offset = 0; offset < profile.length; offset += 32768)
    binary += String.fromCharCode(...profile.subarray(offset, offset + 32768));
  return btoa(binary);
}

export function psdIccFromBase64(value: string | undefined) {
  if (!value) return undefined;
  if (!/^[a-z0-9+/]*={0,2}$/i.test(value))
    throw Error('Invalid PSD ICC profile encoding.');
  const profile = Uint8Array.from(atob(value), (character) =>
    character.charCodeAt(0),
  );
  if (!validPsdIccProfile(profile)) throw Error('Invalid PSD ICC profile.');
  return profile;
}

export function extractPsdIccProfile(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer),
    match = resourceBlocks(buffer).blocks.find(
      (block) => block.id === ICC_RESOURCE_ID,
    );
  if (!match) return undefined;
  const profile = bytes.slice(match.dataStart, match.dataStart + match.size);
  if (!validPsdIccProfile(profile)) throw Error('Malformed PSD ICC profile.');
  return profile;
}

export function injectPsdIccProfile(
  buffer: ArrayBuffer,
  profile: Uint8Array | undefined,
) {
  if (!profile) return buffer;
  if (!validPsdIccProfile(profile)) throw Error('Invalid PSD ICC profile.');
  const bytes = new Uint8Array(buffer),
    section = resourceBlocks(buffer),
    kept = section.blocks.filter((block) => block.id !== ICC_RESOURCE_ID),
    blockLength = 4 + 2 + 2 + 4 + profile.byteLength + (profile.byteLength % 2),
    resourceLength = kept.reduce(
      (total, block) => total + block.end - block.start,
      blockLength,
    ),
    output = new Uint8Array(
      section.start + resourceLength + (bytes.length - section.end),
    ),
    view = new DataView(output.buffer);
  output.set(bytes.subarray(0, section.lengthOffset), 0);
  view.setUint32(section.lengthOffset, resourceLength, false);
  let offset = section.start;
  for (const block of kept) {
    output.set(bytes.subarray(block.start, block.end), offset);
    offset += block.end - block.start;
  }
  output.set([0x38, 0x42, 0x49, 0x4d], offset);
  view.setUint16(offset + 4, ICC_RESOURCE_ID, false);
  output[offset + 6] = 0;
  output[offset + 7] = 0;
  view.setUint32(offset + 8, profile.byteLength, false);
  output.set(profile, offset + 12);
  offset += blockLength;
  output.set(bytes.subarray(section.end), offset);
  return output.buffer;
}
