const clampByte = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)));

/**
 * Apply a thresholded edge-sharpening kernel. Flat areas are left alone so the
 * filter does not amplify sensor noise or compression grain unnecessarily.
 */
export function sharpenRgba(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number,
  threshold = 2,
) {
  if (source.length !== width * height * 4)
    throw new Error('Sharpen input dimensions do not match its pixel data.');
  const output = new Uint8ClampedArray(source);
  const strength = Math.max(0, Math.min(100, amount)) / 100;
  if (!strength || width < 2 || height < 2) return output;

  for (let y = 0; y < height; y++) {
    const up = Math.max(0, y - 1);
    const down = Math.min(height - 1, y + 1);
    for (let x = 0; x < width; x++) {
      const left = Math.max(0, x - 1);
      const right = Math.min(width - 1, x + 1);
      const center = (y * width + x) * 4;
      const neighbors = [
        (up * width + x) * 4,
        (down * width + x) * 4,
        (y * width + left) * 4,
        (y * width + right) * 4,
      ];
      for (let channel = 0; channel < 3; channel++) {
        const average =
          neighbors.reduce((sum, index) => sum + source[index + channel], 0) /
          neighbors.length;
        const difference = source[center + channel] - average;
        if (Math.abs(difference) >= threshold)
          output[center + channel] = clampByte(
            source[center + channel] + difference * strength * 1.8,
          );
      }
    }
  }
  return output;
}

/** Process large canvases in haloed tiles to keep temporary memory bounded. */
export function sharpenCanvasTiled(
  source: HTMLCanvasElement,
  amount: number,
  tileSize = 512,
) {
  const output = document.createElement('canvas');
  output.width = source.width;
  output.height = source.height;
  const sourceContext = source.getContext('2d', { willReadFrequently: true });
  const outputContext = output.getContext('2d');
  if (!sourceContext || !outputContext)
    throw new Error('Smart Sharpen is unavailable in this browser.');
  outputContext.drawImage(source, 0, 0);

  for (let y = 0; y < source.height; y += tileSize) {
    for (let x = 0; x < source.width; x += tileSize) {
      const left = Math.max(0, x - 1);
      const top = Math.max(0, y - 1);
      const right = Math.min(source.width, x + tileSize + 1);
      const bottom = Math.min(source.height, y + tileSize + 1);
      const width = right - left;
      const height = bottom - top;
      const pixels = sourceContext.getImageData(left, top, width, height);
      const sharpened = sharpenRgba(pixels.data, width, height, amount);
      const image = new ImageData(sharpened, width, height);
      const dirtyX = x - left;
      const dirtyY = y - top;
      const dirtyWidth = Math.min(tileSize, source.width - x);
      const dirtyHeight = Math.min(tileSize, source.height - y);
      outputContext.putImageData(
        image,
        left,
        top,
        dirtyX,
        dirtyY,
        dirtyWidth,
        dirtyHeight,
      );
    }
  }
  return output;
}
