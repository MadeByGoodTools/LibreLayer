export type SelectionRect = { x: number; y: number; w: number; h: number };
export type MarqueeShape = 'rectangle' | 'ellipse' | 'row' | 'column';

export const marqueeBounds = (
  shape: MarqueeShape,
  drag: SelectionRect,
  documentWidth: number,
  documentHeight: number,
): SelectionRect => {
  if (shape === 'row')
    return {
      x: 0,
      y: Math.max(0, Math.min(documentHeight - 1, Math.round(drag.y))),
      w: documentWidth,
      h: 1,
    };
  if (shape === 'column')
    return {
      x: Math.max(0, Math.min(documentWidth - 1, Math.round(drag.x))),
      y: 0,
      w: 1,
      h: documentHeight,
    };
  return { ...drag };
};

export const marqueeContains = (
  shape: MarqueeShape,
  bounds: SelectionRect,
  x: number,
  y: number,
) => {
  if (
    x < bounds.x ||
    y < bounds.y ||
    x >= bounds.x + bounds.w ||
    y >= bounds.y + bounds.h
  )
    return false;
  if (shape !== 'ellipse') return true;
  const radiusX = bounds.w / 2,
    radiusY = bounds.h / 2;
  if (!radiusX || !radiusY) return false;
  const dx = (x + 0.5 - bounds.x - radiusX) / radiusX,
    dy = (y + 0.5 - bounds.y - radiusY) / radiusY;
  return dx * dx + dy * dy <= 1;
};

export const marqueeCoverage = (
  shape: Exclude<MarqueeShape, 'row' | 'column'>,
  bounds: SelectionRect,
  x: number,
  y: number,
  samples = 8,
) => {
  if (bounds.w <= 0 || bounds.h <= 0) return 0;
  if (shape === 'rectangle') {
    const horizontal = Math.max(
        0,
        Math.min(x + 1, bounds.x + bounds.w) - Math.max(x, bounds.x),
      ),
      vertical = Math.max(
        0,
        Math.min(y + 1, bounds.y + bounds.h) - Math.max(y, bounds.y),
      );
    return horizontal * vertical;
  }
  const count = Math.max(2, Math.min(16, Math.round(samples))),
    radiusX = bounds.w / 2,
    radiusY = bounds.h / 2,
    centerX = bounds.x + radiusX,
    centerY = bounds.y + radiusY;
  let inside = 0;
  for (let sampleY = 0; sampleY < count; sampleY++)
    for (let sampleX = 0; sampleX < count; sampleX++) {
      const dx = (x + (sampleX + 0.5) / count - centerX) / radiusX,
        dy = (y + (sampleY + 0.5) / count - centerY) / radiusY;
      if (dx * dx + dy * dy <= 1) inside++;
    }
  return inside / (count * count);
};

const luminance = (pixels: Uint8ClampedArray, index: number) =>
  0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2];

export const strongestEdgeInPatch = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  originX = 0,
  originY = 0,
  stride = 1,
) => {
  if (width < 3 || height < 3 || pixels.length !== width * height * 4)
    return { x: originX, y: originY, score: 0 };
  let best = { x: originX + 1, y: originY + 1, score: -1 };
  for (let y = 1; y < height - 1; y += Math.max(1, stride))
    for (let x = 1; x < width - 1; x += Math.max(1, stride)) {
      const left = (y * width + x - 1) * 4,
        right = (y * width + x + 1) * 4,
        top = ((y - 1) * width + x) * 4,
        bottom = ((y + 1) * width + x) * 4,
        score =
          Math.abs(luminance(pixels, left) - luminance(pixels, right)) +
          Math.abs(luminance(pixels, top) - luminance(pixels, bottom));
      if (score > best.score) best = { x: originX + x, y: originY + y, score };
    }
  return best;
};
