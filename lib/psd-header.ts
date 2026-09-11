export type PsdHeader = {
  version: 1 | 2;
  width: number;
  height: number;
  bitDepth: 8 | 16 | 32;
};

export function readSupportedPsdHeader(buffer: ArrayBuffer): PsdHeader {
  if (buffer.byteLength < 26) throw new Error('Incomplete PSD/PSB header.');
  const header = new DataView(buffer);
  const version = header.getUint16(4);
  if (header.getUint32(0) !== 0x38425053 || ![1, 2].includes(version))
    throw new Error('Choose a valid PSD or PSB file.');
  const bitDepth = header.getUint16(22);
  if (![8, 16, 32].includes(bitDepth) || header.getUint16(24) !== 3)
    throw new Error(
      'Only 8-, 16- or 32-bit RGB PSD/PSB files are supported. Convert CMYK, Lab or indexed files first.',
    );
  return {
    version: version as 1 | 2,
    width: header.getUint32(18),
    height: header.getUint32(14),
    bitDepth: bitDepth as 8 | 16 | 32,
  };
}
