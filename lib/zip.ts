export type ZipEntry = { name: string; data: Uint8Array };

const table = Uint32Array.from({ length: 256 }, (_, value) => {
  let current = value;
  for (let bit = 0; bit < 8; bit++)
    current = current & 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
  return current >>> 0;
});

const crc32 = (data: Uint8Array) => {
  let value = 0xffffffff;
  for (const byte of data) value = table[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
};

const u16 = (view: DataView, offset: number, value: number) =>
  view.setUint16(offset, value, true);
const u32 = (view: DataView, offset: number, value: number) =>
  view.setUint32(offset, value >>> 0, true);

export function createStoreZip(entries: readonly ZipEntry[]) {
  if (!entries.length || entries.length > 1000)
    throw Error('ZIP exports require 1 to 1000 files.');
  const encoder = new TextEncoder(),
    names = entries.map((entry) =>
      encoder.encode(entry.name.replace(/^\/+|\.\.(?:\/|\\)/g, '_')),
    );
  if (names.some((name) => !name.length || name.length > 65535))
    throw Error('A ZIP filename is invalid.');
  const localSize = entries.reduce(
      (sum, entry, index) => sum + 30 + names[index].length + entry.data.length,
      0,
    ),
    centralSize = entries.reduce(
      (sum, _entry, index) => sum + 46 + names[index].length,
      0,
    ),
    output = new Uint8Array(localSize + centralSize + 22),
    view = new DataView(output.buffer),
    offsets: number[] = [];
  let offset = 0;
  entries.forEach((entry, index) => {
    const name = names[index],
      checksum = crc32(entry.data);
    offsets.push(offset);
    u32(view, offset, 0x04034b50);
    u16(view, offset + 4, 20);
    u16(view, offset + 6, 0x0800);
    u32(view, offset + 14, checksum);
    u32(view, offset + 18, entry.data.length);
    u32(view, offset + 22, entry.data.length);
    u16(view, offset + 26, name.length);
    output.set(name, offset + 30);
    output.set(entry.data, offset + 30 + name.length);
    offset += 30 + name.length + entry.data.length;
  });
  const centralOffset = offset;
  entries.forEach((entry, index) => {
    const name = names[index],
      checksum = crc32(entry.data);
    u32(view, offset, 0x02014b50);
    u16(view, offset + 4, 20);
    u16(view, offset + 6, 20);
    u16(view, offset + 8, 0x0800);
    u32(view, offset + 16, checksum);
    u32(view, offset + 20, entry.data.length);
    u32(view, offset + 24, entry.data.length);
    u16(view, offset + 28, name.length);
    u32(view, offset + 42, offsets[index]);
    output.set(name, offset + 46);
    offset += 46 + name.length;
  });
  u32(view, offset, 0x06054b50);
  u16(view, offset + 8, entries.length);
  u16(view, offset + 10, entries.length);
  u32(view, offset + 12, centralSize);
  u32(view, offset + 16, centralOffset);
  return output;
}
