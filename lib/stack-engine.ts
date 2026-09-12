export type StackMode = 'mean' | 'median' | 'minimum' | 'maximum' | 'range';
export type Translation = { x: number; y: number; error: number };

const byte = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
const validate = (
  sources: readonly Uint8ClampedArray[],
  width: number,
  height: number,
) => {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    sources.length < 1 ||
    sources.some((source) => source.length !== width * height * 4)
  )
    throw Error('Image stack dimensions are invalid.');
};
const luma = (data: Uint8ClampedArray, index: number) =>
  data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;

const estimateTranslationWithin = (
  reference: Uint8ClampedArray,
  target: Uint8ClampedArray,
  width: number,
  height: number,
  maxX: number,
  maxY: number,
): Translation => {
  validate([reference, target], width, height);
  const boundedX = Math.max(0, Math.min(width - 1, Math.round(maxX))),
    boundedY = Math.max(0, Math.min(height - 1, Math.round(maxY))),
    sampleStep = Math.max(1, Math.floor(Math.max(width, height) / 128));
  let best = { x: 0, y: 0, error: Number.POSITIVE_INFINITY };
  const score = (xShift: number, yShift: number) => {
      let error = 0,
        samples = 0;
      const xStart = Math.max(0, xShift),
        xEnd = Math.min(width, width + xShift),
        yStart = Math.max(0, yShift),
        yEnd = Math.min(height, height + yShift);
      for (let y = yStart; y < yEnd; y += sampleStep)
        for (let x = xStart; x < xEnd; x += sampleStep) {
          const referenceIndex = (y * width + x) * 4,
            targetIndex = ((y - yShift) * width + x - xShift) * 4;
          if (!reference[referenceIndex + 3] || !target[targetIndex + 3])
            continue;
          error += Math.abs(
            luma(reference, referenceIndex) - luma(target, targetIndex),
          );
          samples++;
        }
      if (!samples) return;
      const possibleSamples = Math.max(
          1,
          Math.ceil((width / sampleStep) * (height / sampleStep)),
        ),
        overlap = samples / possibleSamples,
        candidateError = error / samples + (1 - overlap) * 24;
      if (candidateError < best.error)
        best = { x: xShift, y: yShift, error: candidateError };
    },
    coarseX = Math.max(1, Math.ceil(boundedX / 16)),
    coarseY = Math.max(1, Math.ceil(boundedY / 10)),
    xShifts = new Set<number>([-boundedX, 0, boundedX]),
    yShifts = new Set<number>([-boundedY, 0, boundedY]);
  for (let shift = -boundedX; shift <= boundedX; shift += coarseX)
    xShifts.add(shift);
  for (let shift = -boundedY; shift <= boundedY; shift += coarseY)
    yShifts.add(shift);
  for (const yShift of yShifts)
    for (const xShift of xShifts) score(xShift, yShift);
  if ((coarseX > 1 || coarseY > 1) && Number.isFinite(best.error)) {
    const coarseBest = best;
    for (
      let yShift = Math.max(-boundedY, coarseBest.y - coarseY);
      yShift <= Math.min(boundedY, coarseBest.y + coarseY);
      yShift++
    )
      for (
        let xShift = Math.max(-boundedX, coarseBest.x - coarseX);
        xShift <= Math.min(boundedX, coarseBest.x + coarseX);
        xShift++
      )
        score(xShift, yShift);
  }
  if (!Number.isFinite(best.error))
    throw Error('The images do not contain overlapping visible pixels.');
  return best;
};

/** Estimate the translation that places target content over the reference. */
export function estimateTranslation(
  reference: Uint8ClampedArray,
  target: Uint8ClampedArray,
  width: number,
  height: number,
  maxShift = Math.min(96, Math.floor(Math.min(width, height) / 3)),
): Translation {
  const bounded = Math.max(
    0,
    Math.min(Math.floor(Math.min(width, height) / 2), Math.round(maxShift)),
  );
  return estimateTranslationWithin(
    reference,
    target,
    width,
    height,
    bounded,
    bounded,
  );
}

export function statisticalStack(
  sources: readonly Uint8ClampedArray[],
  width: number,
  height: number,
  mode: StackMode,
) {
  validate(sources, width, height);
  if (!['mean', 'median', 'minimum', 'maximum', 'range'].includes(mode))
    throw Error('Image stack mode is invalid.');
  const output = new Uint8ClampedArray(width * height * 4),
    values: number[] = [];
  for (let index = 0; index < output.length; index += 4) {
    let maximumAlpha = 0;
    for (let channel = 0; channel < 3; channel++) {
      values.length = 0;
      for (const source of sources)
        if (source[index + 3]) {
          values.push(source[index + channel]);
          maximumAlpha = Math.max(maximumAlpha, source[index + 3]);
        }
      if (!values.length) continue;
      values.sort((a, b) => a - b);
      const value =
        mode === 'mean'
          ? values.reduce((sum, item) => sum + item, 0) / values.length
          : mode === 'median'
            ? values.length % 2
              ? values[(values.length - 1) / 2]
              : (values[values.length / 2 - 1] + values[values.length / 2]) / 2
            : mode === 'minimum'
              ? values[0]
              : mode === 'maximum'
                ? values.at(-1)!
                : values.at(-1)! - values[0];
      output[index + channel] = byte(value);
    }
    output[index + 3] = maximumAlpha;
  }
  return output;
}

const sharpness = (
  source: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
) => {
  const at = (px: number, py: number) =>
      luma(
        source,
        (Math.max(0, Math.min(height - 1, py)) * width +
          Math.max(0, Math.min(width - 1, px))) *
          4,
      ),
    center = at(x, y);
  return Math.abs(
    at(x - 1, y) + at(x + 1, y) + at(x, y - 1) + at(x, y + 1) - center * 4,
  );
};

export function focusStack(
  sources: readonly Uint8ClampedArray[],
  width: number,
  height: number,
) {
  validate(sources, width, height);
  const output = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      let best = 0,
        bestScore = -1;
      for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
        if (!sources[sourceIndex][index + 3]) continue;
        const score = sharpness(sources[sourceIndex], width, height, x, y);
        if (score > bestScore) {
          best = sourceIndex;
          bestScore = score;
        }
      }
      output.set(sources[best].subarray(index, index + 4), index);
    }
  return output;
}

/** Exposure fusion used by Auto-Blend. */
export function autoBlendStack(
  sources: readonly Uint8ClampedArray[],
  width: number,
  height: number,
) {
  validate(sources, width, height);
  const output = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      let weightTotal = 0,
        alpha = 0;
      const totals = [0, 0, 0];
      for (const source of sources) {
        if (!source[index + 3]) continue;
        const luminance = luma(source, index) / 255,
          saturation =
            (Math.max(source[index], source[index + 1], source[index + 2]) -
              Math.min(source[index], source[index + 1], source[index + 2])) /
            255,
          detail = sharpness(source, width, height, x, y) / 255,
          exposed = Math.exp(-((luminance - 0.5) ** 2) / 0.08),
          weight = 0.001 + exposed + saturation * 0.35 + detail * 0.65;
        for (let channel = 0; channel < 3; channel++)
          totals[channel] += source[index + channel] * weight;
        weightTotal += weight;
        alpha = Math.max(alpha, source[index + 3]);
      }
      if (weightTotal)
        for (let channel = 0; channel < 3; channel++)
          output[index + channel] = byte(totals[channel] / weightTotal);
      output[index + 3] = alpha;
    }
  return output;
}

/** Merge bracketed display images into a scene-linear HDR buffer. */
export function mergeHdrStack(
  sources: readonly Uint8ClampedArray[],
  width: number,
  height: number,
  exposureEv = sources.map((_, index) => index - (sources.length - 1) / 2),
) {
  validate(sources, width, height);
  if (
    exposureEv.length !== sources.length ||
    exposureEv.some((value) => !Number.isFinite(value))
  )
    throw Error('HDR exposure metadata is invalid.');
  const output = new Float32Array(width * height * 4);
  for (let index = 0; index < output.length; index += 4) {
    let alpha = 0;
    for (let channel = 0; channel < 3; channel++) {
      let total = 0,
        weightTotal = 0;
      for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
        const source = sources[sourceIndex];
        if (!source[index + 3]) continue;
        const encoded = source[index + channel] / 255,
          linear =
            (encoded <= 0.04045
              ? encoded / 12.92
              : ((encoded + 0.055) / 1.055) ** 2.4) /
            2 ** exposureEv[sourceIndex],
          weight = Math.max(0.02, 1 - Math.abs(encoded - 0.5) * 1.9);
        total += linear * weight;
        weightTotal += weight;
        alpha = Math.max(alpha, source[index + 3] / 255);
      }
      output[index + channel] = weightTotal ? total / weightTotal : 0;
    }
    output[index + 3] = alpha;
  }
  return output;
}

export function toneMapHdr(source: Float32Array) {
  if (source.length % 4) throw Error('HDR pixels are invalid.');
  const output = new Uint8ClampedArray(source.length);
  for (let index = 0; index < source.length; index += 4) {
    for (let channel = 0; channel < 3; channel++) {
      const mapped =
        Math.max(0, source[index + channel]) /
        (1 + Math.max(0, source[index + channel]));
      const encoded =
        mapped <= 0.0031308
          ? mapped * 12.92
          : 1.055 * mapped ** (1 / 2.4) - 0.055;
      output[index + channel] = byte(encoded * 255);
    }
    output[index + 3] = byte(source[index + 3] * 255);
  }
  return output;
}

export type PanoramaResult = {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
  translations: Translation[];
};

/** Register an ordered sequence and blend it into an expanded panorama. */
export function stitchPanorama(
  sources: readonly Uint8ClampedArray[],
  width: number,
  height: number,
): PanoramaResult {
  validate(sources, width, height);
  if (sources.length < 2)
    throw Error('Panorama stitching requires at least two images.');
  const translations: Translation[] = [{ x: 0, y: 0, error: 0 }];
  for (let index = 1; index < sources.length; index++) {
    const local = estimateTranslationWithin(
        sources[index - 1],
        sources[index],
        width,
        height,
        Math.floor(width * 0.9),
        Math.floor(height * 0.3),
      ),
      previous = translations[index - 1];
    translations.push({
      x: previous.x + local.x,
      y: previous.y + local.y,
      error: local.error,
    });
  }
  const minX = Math.min(...translations.map((item) => item.x)),
    minY = Math.min(...translations.map((item) => item.y)),
    maxX = Math.max(...translations.map((item) => item.x + width)),
    maxY = Math.max(...translations.map((item) => item.y + height)),
    outputWidth = maxX - minX,
    outputHeight = maxY - minY;
  if (outputWidth * outputHeight > 64_000_000)
    throw Error(
      'The stitched panorama would exceed the 64-megapixel document limit.',
    );
  const output = new Uint8ClampedArray(outputWidth * outputHeight * 4),
    totals = new Float32Array(outputWidth * 3),
    weights = new Float32Array(outputWidth),
    alphas = new Uint8ClampedArray(outputWidth);
  for (let outputY = 0; outputY < outputHeight; outputY++) {
    totals.fill(0);
    weights.fill(0);
    alphas.fill(0);
    for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
      const translation = translations[sourceIndex],
        sourceY = outputY + minY - translation.y;
      if (sourceY < 0 || sourceY >= height) continue;
      const source = sources[sourceIndex];
      for (let sourceX = 0; sourceX < width; sourceX++) {
        const destinationX = sourceX + translation.x - minX;
        if (destinationX < 0 || destinationX >= outputWidth) continue;
        const sourceOffset = (sourceY * width + sourceX) * 4,
          alpha = source[sourceOffset + 3];
        if (!alpha) continue;
        const edge = Math.max(
            0.05,
            Math.min(
              1,
              Math.min(sourceX + 1, width - sourceX) /
                Math.max(1, width * 0.12),
            ),
          ),
          weight = (alpha / 255) * edge,
          totalOffset = destinationX * 3;
        for (let channel = 0; channel < 3; channel++)
          totals[totalOffset + channel] +=
            source[sourceOffset + channel] * weight;
        weights[destinationX] += weight;
        alphas[destinationX] = Math.max(alphas[destinationX], alpha);
      }
    }
    for (let x = 0; x < outputWidth; x++) {
      const destinationOffset = (outputY * outputWidth + x) * 4,
        totalOffset = x * 3;
      if (weights[x])
        for (let channel = 0; channel < 3; channel++)
          output[destinationOffset + channel] = byte(
            totals[totalOffset + channel] / weights[x],
          );
      output[destinationOffset + 3] = alphas[x];
    }
  }
  return {
    width: outputWidth,
    height: outputHeight,
    pixels: output,
    translations,
  };
}
