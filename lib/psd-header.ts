export type PsdHeader = {
  version: 1 | 2;
  width: number;
  height: number;
  bitDepth: 1 | 8 | 16 | 32;
  colorMode: 'bitmap' | 'grayscale' | 'indexed' | 'rgb' | 'cmyk' | 'lab';
};

export function readSupportedPsdHeader(buffer: ArrayBuffer): PsdHeader {
  if (buffer.byteLength < 26) throw new Error('Incomplete PSD/PSB header.');
  const header = new DataView(buffer);
  const version = header.getUint16(4);
  if (header.getUint32(0) !== 0x38425053 || ![1, 2].includes(version))
    throw new Error('Choose a valid PSD or PSB file.');
  const bitDepth = header.getUint16(22);
  const colorModeCode = header.getUint16(24),
    colorMode = (
      {
        0: 'bitmap',
        1: 'grayscale',
        2: 'indexed',
        3: 'rgb',
        4: 'cmyk',
        9: 'lab',
      } as const
    )[colorModeCode as 0 | 1 | 2 | 3 | 4 | 9];
  if (!colorMode)
    throw new Error(
      'This PSD color mode is not supported yet. Convert multichannel or duotone files to RGB first.',
    );
  if (
    ![1, 8, 16, 32].includes(bitDepth) ||
    (colorMode === 'bitmap' && bitDepth !== 1) ||
    (colorMode === 'indexed' && bitDepth !== 8) ||
    (colorMode !== 'bitmap' && colorMode !== 'indexed' && bitDepth === 1)
  )
    throw new Error(`Unsupported ${bitDepth}-bit ${colorMode} PSD/PSB file.`);
  return {
    version: version as 1 | 2,
    width: header.getUint32(18),
    height: header.getUint32(14),
    bitDepth: bitDepth as 1 | 8 | 16 | 32,
    colorMode,
  };
}
