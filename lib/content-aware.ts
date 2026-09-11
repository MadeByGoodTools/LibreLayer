export type ContentAwareSamplingMode =
  | 'auto'
  | 'rectangular'
  | 'custom'
  | 'all-layers';

export type ContentAwareOptions = {
  samplingMode: ContentAwareSamplingMode;
  sampleRect?: { x: number; y: number; w: number; h: number };
  samplePoint?: { x: number; y: number };
  colorAdaptation: number;
  rotation: 0 | 90 | 180 | 270;
  scale: number;
  mirror: boolean;
};

export type ContentAwareResult = {
  pixels: Uint8ClampedArray;
  sampled: Uint8ClampedArray;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function selectionBounds(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
) {
  let left = width,
    top = height,
    right = -1,
    bottom = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (!mask[(y * width + x) * 4 + 3]) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  return right < left
    ? null
    : { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

export function contentAwareFill(
  source: Uint8ClampedArray,
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  options: ContentAwareOptions,
): ContentAwareResult {
  if (
    width < 1 ||
    height < 1 ||
    source.length !== width * height * 4 ||
    mask.length !== source.length
  )
    throw Error('Content-aware buffers do not match the document');
  const bounds = selectionBounds(mask, width, height);
  if (!bounds) throw Error('Content-Aware Fill requires a selection');
  const output = new Uint8ClampedArray(source);
  const sampled = new Uint8ClampedArray(source.length);
  const ring = Math.max(3, Math.round(Math.min(bounds.w, bounds.h) * 0.35));
  const requested = options.sampleRect;
  const region =
    options.samplingMode === 'rectangular' && requested
      ? {
          x: clamp(Math.floor(requested.x), 0, width - 1),
          y: clamp(Math.floor(requested.y), 0, height - 1),
          w: clamp(Math.floor(requested.w), 1, width),
          h: clamp(Math.floor(requested.h), 1, height),
        }
      : options.samplingMode === 'all-layers'
        ? { x: 0, y: 0, w: width, h: height }
        : {
            x: Math.max(0, bounds.x - ring),
            y: Math.max(0, bounds.y - ring),
            w:
              Math.min(width, bounds.x + bounds.w + ring) -
              Math.max(0, bounds.x - ring),
            h:
              Math.min(height, bounds.y + bounds.h + ring) -
              Math.max(0, bounds.y - ring),
          };
  region.w = Math.min(region.w, width - region.x);
  region.h = Math.min(region.h, height - region.y);
  const candidates: Array<[number, number]> = [];
  for (let y = region.y; y < region.y + region.h; y++)
    for (let x = region.x; x < region.x + region.w; x++) {
      const i = (y * width + x) * 4;
      if (mask[i + 3] || !source[i + 3]) continue;
      if (
        options.samplingMode === 'custom' &&
        options.samplePoint &&
        Math.hypot(x - options.samplePoint.x, y - options.samplePoint.y) >
          Math.max(bounds.w, bounds.h) * 1.75
      )
        continue;
      candidates.push([x, y]);
      sampled[i + 3] = 255;
    }
  if (!candidates.length)
    throw Error('No usable pixels exist in the sampling area');
  const sampleMean = [0, 0, 0];
  for (const [x, y] of candidates) {
    const i = (y * width + x) * 4;
    sampleMean[0] += source[i];
    sampleMean[1] += source[i + 1];
    sampleMean[2] += source[i + 2];
  }
  for (let c = 0; c < 3; c++) sampleMean[c] /= candidates.length;
  const targetMean = [0, 0, 0];
  let targetCount = 0;
  for (let y = bounds.y; y < bounds.y + bounds.h; y++)
    for (let x = bounds.x; x < bounds.x + bounds.w; x++) {
      const i = (y * width + x) * 4;
      if (!mask[i + 3]) continue;
      for (let c = 0; c < 3; c++) targetMean[c] += source[i + c];
      targetCount++;
    }
  for (let c = 0; c < 3; c++) targetMean[c] /= Math.max(1, targetCount);
  const amount = clamp(options.colorAdaptation, 0, 100) / 100;
  const scale = clamp(options.scale, 25, 400) / 100;
  const angle = (options.rotation * Math.PI) / 180;
  const cos = Math.cos(angle),
    sin = Math.sin(angle),
    centerX = bounds.x + (bounds.w - 1) / 2,
    centerY = bounds.y + (bounds.h - 1) / 2;
  for (let y = bounds.y; y < bounds.y + bounds.h; y++)
    for (let x = bounds.x; x < bounds.x + bounds.w; x++) {
      const i = (y * width + x) * 4,
        alpha = mask[i + 3] / 255;
      if (!alpha) continue;
      let dx = (x - centerX) / scale;
      const dy = (y - centerY) / scale;
      if (options.mirror) dx *= -1;
      const rx = Math.round(dx * cos - dy * sin),
        ry = Math.round(dx * sin + dy * cos),
        seed = Math.abs((rx * 73856093) ^ (ry * 19349663) ^ (x * 83492791));
      const [sx, sy] = candidates[seed % candidates.length],
        si = (sy * width + sx) * 4;
      for (let c = 0; c < 3; c++) {
        const adapted =
          source[si + c] + (targetMean[c] - sampleMean[c]) * amount;
        output[i + c] =
          source[i + c] * (1 - alpha) + clamp(adapted, 0, 255) * alpha;
      }
      output[i + 3] = Math.max(source[i + 3], mask[i + 3]);
    }
  return { pixels: output, sampled };
}
