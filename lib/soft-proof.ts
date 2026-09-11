export type SoftProofMode = 'none' | 'cmyk' | 'grayscale';

export function isProofGamutWarning(
  red: number,
  green: number,
  blue: number,
  mode: SoftProofMode,
) {
  if (mode === 'none') return false;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  if (mode === 'grayscale') return maximum - minimum > 28;
  const chroma = maximum - minimum;
  return chroma > 168 && (maximum > 224 || minimum < 24);
}
