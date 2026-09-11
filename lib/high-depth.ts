export type PrecisionPixels =
  | Uint8Array
  | Uint8ClampedArray
  | Uint16Array
  | Float32Array;

export type PrecisionImage = {
  width: number;
  height: number;
  data: PrecisionPixels;
};

export type PrecisionBlendMode = 'normal' | 'multiply' | 'screen' | 'overlay';

export type PrecisionLayer = PrecisionImage & {
  opacity?: number;
  blend?: PrecisionBlendMode;
  visible?: boolean;
  mask?: PrecisionPixels;
};

const clamp = (value: number, low = 0, high = 1) =>
  Math.max(low, Math.min(high, value));

const maximumFor = (data: PrecisionPixels) =>
  data instanceof Float32Array ? 1 : data instanceof Uint16Array ? 65535 : 255;

const sample = (data: PrecisionPixels, index: number) =>
  data instanceof Float32Array ? data[index] : data[index] / maximumFor(data);

const blend = (backdrop: number, source: number, mode: PrecisionBlendMode) => {
  if (mode === 'multiply') return backdrop * source;
  if (mode === 'screen') return backdrop + source - backdrop * source;
  if (mode === 'overlay')
    return backdrop <= 0.5
      ? 2 * backdrop * source
      : 1 - 2 * (1 - backdrop) * (1 - source);
  return source;
};

/**
 * Composite same-sized straight-alpha layers into a scene-linear float buffer.
 * RGB values above 1 remain available in normal mode for 32-bit HDR work.
 */
export function compositeHighDepth(
  width: number,
  height: number,
  layers: PrecisionLayer[],
) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1)
    throw new Error('High-depth composite dimensions are invalid.');
  const pixels = width * height;
  const output = new Float32Array(pixels * 4);
  for (const layer of layers) {
    if (layer.visible === false) continue;
    if (layer.width !== width || layer.height !== height || layer.data.length !== pixels * 4)
      throw new Error('High-depth layers must match the composite dimensions.');
    const opacity = clamp(layer.opacity ?? 1);
    const mode = layer.blend ?? 'normal';
    for (let pixel = 0; pixel < pixels; pixel++) {
      const index = pixel * 4;
      const mask = layer.mask ? clamp(sample(layer.mask, pixel)) : 1;
      const sourceAlpha = clamp(sample(layer.data, index + 3)) * opacity * mask;
      if (!sourceAlpha) continue;
      const backdropAlpha = output[index + 3];
      const outputAlpha = sourceAlpha + backdropAlpha * (1 - sourceAlpha);
      for (let channel = 0; channel < 3; channel++) {
        const source = sample(layer.data, index + channel);
        const backdrop = output[index + channel];
        const blended = blend(backdrop, source, mode);
        const premultiplied =
          (1 - sourceAlpha) * backdrop * backdropAlpha +
          (1 - backdropAlpha) * source * sourceAlpha +
          sourceAlpha * backdropAlpha * blended;
        output[index + channel] = outputAlpha ? premultiplied / outputAlpha : 0;
      }
      output[index + 3] = outputAlpha;
    }
  }
  return output;
}

const encodeSrgb = (value: number) => {
  const safe = clamp(value);
  return safe <= 0.0031308 ? safe * 12.92 : 1.055 * safe ** (1 / 2.4) - 0.055;
};

/** Convert 8/16/32-bit RGBA pixels to an 8-bit browser display preview. */
export function precisionToDisplayRgba(image: PrecisionImage) {
  if (image.data.length !== image.width * image.height * 4)
    throw new Error('High-depth pixel data length does not match its dimensions.');
  if (image.data instanceof Uint8ClampedArray)
    return new Uint8ClampedArray(image.data);
  const result = new Uint8ClampedArray(image.data.length);
  const floating = image.data instanceof Float32Array;
  for (let index = 0; index < image.data.length; index += 4) {
    for (let channel = 0; channel < 3; channel++) {
      let value = sample(image.data, index + channel);
      if (floating) {
        // Preserve normal-range values and smoothly compress HDR highlights.
        if (value > 1) value = value / (1 + Math.max(0, value - 1));
        value = encodeSrgb(value);
      }
      result[index + channel] = Math.round(clamp(value) * 255);
    }
    result[index + 3] = Math.round(clamp(sample(image.data, index + 3)) * 255);
  }
  return result;
}
