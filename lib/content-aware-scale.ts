export type RasterPixels = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const maskAlpha = (
  mask: Uint8ClampedArray | undefined,
  pixel: number,
  pixelCount: number,
) => {
  if (!mask) return 0;
  if (mask.length === pixelCount) return mask[pixel] / 255;
  if (mask.length === pixelCount * 4) return mask[pixel * 4 + 3] / 255;
  throw new Error('Protection mask dimensions do not match the image');
};

const axisWeights = (
  source: RasterPixels,
  axis: 'x' | 'y',
  protectMask?: Uint8ClampedArray,
) => {
  const { width, height, data } = source,
    length = axis === 'x' ? width : height,
    cross = axis === 'x' ? height : width,
    raw = new Float64Array(length),
    protectedCoverage = new Float64Array(length);
  for (let primary = 0; primary < length; primary++) {
    let energy = 0,
      protectedPixels = 0;
    for (let secondary = 0; secondary < cross; secondary++) {
      const x = axis === 'x' ? primary : secondary,
        y = axis === 'x' ? secondary : primary,
        left = Math.max(0, x - 1),
        right = Math.min(width - 1, x + 1),
        top = Math.max(0, y - 1),
        bottom = Math.min(height - 1, y + 1),
        li = (y * width + left) * 4,
        ri = (y * width + right) * 4,
        ti = (top * width + x) * 4,
        bi = (bottom * width + x) * 4;
      for (let channel = 0; channel < 4; channel++)
        energy +=
          Math.abs(data[ri + channel] - data[li + channel]) +
          Math.abs(data[bi + channel] - data[ti + channel]);
      protectedPixels += maskAlpha(protectMask, y * width + x, width * height);
    }
    raw[primary] = energy / Math.max(1, cross);
    protectedCoverage[primary] = protectedPixels / Math.max(1, cross);
  }
  const mean = raw.reduce((sum, value) => sum + value, 0) / Math.max(1, length),
    weights = new Float64Array(length);
  for (let index = 0; index < length; index++) {
    const detail = mean > 0 ? clamp(raw[index] / mean, 0, 6) : 0;
    weights[index] = 1 + detail * 0.7 + protectedCoverage[index] * 12;
  }
  return weights;
};

const sourceMap = (weights: Float64Array, targetLength: number) => {
  const cumulative = new Float64Array(weights.length + 1);
  for (let index = 0; index < weights.length; index++)
    cumulative[index + 1] = cumulative[index] + weights[index];
  const total = cumulative[cumulative.length - 1],
    map = new Float64Array(targetLength);
  let sourceIndex = 0;
  for (let target = 0; target < targetLength; target++) {
    const wanted = ((target + 0.5) / targetLength) * total;
    while (
      sourceIndex < weights.length - 1 &&
      cumulative[sourceIndex + 1] < wanted
    )
      sourceIndex++;
    const local =
      (wanted - cumulative[sourceIndex]) / Math.max(1e-9, weights[sourceIndex]);
    map[target] = clamp(sourceIndex + local - 0.5, 0, weights.length - 1);
  }
  return map;
};

const bilinear = (
  source: RasterPixels,
  x: number,
  y: number,
  channel: number,
) => {
  const x0 = Math.floor(x),
    y0 = Math.floor(y),
    x1 = Math.min(source.width - 1, x0 + 1),
    y1 = Math.min(source.height - 1, y0 + 1),
    tx = x - x0,
    ty = y - y0,
    at = (px: number, py: number) =>
      source.data[(py * source.width + px) * 4 + channel],
    top = at(x0, y0) * (1 - tx) + at(x1, y0) * tx,
    bottom = at(x0, y1) * (1 - tx) + at(x1, y1) * tx;
  return top * (1 - ty) + bottom * ty;
};

/**
 * Content-aware resize using a deterministic seam-energy coordinate field.
 * Detailed and protected regions receive more of the destination axis while
 * low-energy regions absorb most of the compression or expansion.
 */
export const contentAwareScale = (
  source: RasterPixels,
  targetWidth: number,
  targetHeight: number,
  protectMask?: Uint8ClampedArray,
): RasterPixels => {
  if (
    !Number.isInteger(source.width) ||
    !Number.isInteger(source.height) ||
    source.width < 1 ||
    source.height < 1 ||
    source.data.length !== source.width * source.height * 4
  )
    throw new Error('Content-Aware Scale requires a complete RGBA image');
  if (
    !Number.isInteger(targetWidth) ||
    !Number.isInteger(targetHeight) ||
    targetWidth < 1 ||
    targetHeight < 1
  )
    throw new Error('Content-Aware Scale target dimensions must be positive');
  if (targetWidth === source.width && targetHeight === source.height)
    return { ...source, data: new Uint8ClampedArray(source.data) };

  const xMap = sourceMap(axisWeights(source, 'x', protectMask), targetWidth),
    yMap = sourceMap(axisWeights(source, 'y', protectMask), targetHeight),
    data = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  for (let y = 0; y < targetHeight; y++)
    for (let x = 0; x < targetWidth; x++) {
      const target = (y * targetWidth + x) * 4;
      for (let channel = 0; channel < 4; channel++)
        data[target + channel] = Math.round(
          bilinear(source, xMap[x], yMap[y], channel),
        );
    }
  return { width: targetWidth, height: targetHeight, data };
};
