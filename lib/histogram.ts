export type HistogramData = {
  red: Uint32Array;
  green: Uint32Array;
  blue: Uint32Array;
  luminance: Uint32Array;
  opaquePixels: number;
  shadowClipped: number;
  highlightClipped: number;
};

export function analyzeHistogram(pixels: Uint8ClampedArray): HistogramData {
  if (pixels.length % 4 !== 0)
    throw new Error('Histogram input must contain complete RGBA pixels.');
  const result: HistogramData = {
    red: new Uint32Array(256),
    green: new Uint32Array(256),
    blue: new Uint32Array(256),
    luminance: new Uint32Array(256),
    opaquePixels: 0,
    shadowClipped: 0,
    highlightClipped: 0,
  };
  for (let index = 0; index < pixels.length; index += 4) {
    if (!pixels[index + 3]) continue;
    const red = pixels[index],
      green = pixels[index + 1],
      blue = pixels[index + 2],
      luminance = Math.max(
        0,
        Math.min(
          255,
          Math.round(0.2126 * red + 0.7152 * green + 0.0722 * blue),
        ),
      );
    result.red[red]++;
    result.green[green]++;
    result.blue[blue]++;
    result.luminance[luminance]++;
    result.opaquePixels++;
    if (luminance <= 1) result.shadowClipped++;
    if (luminance >= 254) result.highlightClipped++;
  }
  return result;
}
