export type BlendRange = [number, number, number, number];
export type BlendIf = {
  channel?: 'gray' | 'red' | 'green' | 'blue';
  source: BlendRange;
  backdrop: BlendRange;
};
export const defaultBlendIf: BlendIf = {
  channel: 'gray',
  source: [0, 0, 255, 255],
  backdrop: [0, 0, 255, 255],
};
export const extraBlends = {
  'linear-dodge': 'Linear Dodge (Add)',
  'linear-burn': 'Linear Burn',
  subtract: 'Subtract',
  divide: 'Divide',
  'linear-light': 'Linear Light',
  'pin-light': 'Pin Light',
  'vivid-light': 'Vivid Light',
  'hard-mix': 'Hard Mix',
  'darker-color': 'Darker Color',
  'lighter-color': 'Lighter Color',
  dissolve: 'Dissolve',
};
export type ExtraBlend = keyof typeof extraBlends;
export type BlendSpace = 'gamma' | 'linear';
export const pixelBlendModes = new Set([
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
  ...Object.keys(extraBlends),
]);
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const srgbToLinear = (value: number) =>
  value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
const linearToSrgb = (value: number) =>
  value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
const luminance = ([r, g, b]: number[]) => 0.3 * r + 0.59 * g + 0.11 * b;
const saturation = (rgb: number[]) => Math.max(...rgb) - Math.min(...rgb);
const clipColor = (rgb: number[]) => {
  const light = luminance(rgb),
    low = Math.min(...rgb),
    high = Math.max(...rgb);
  let next = [...rgb];
  if (low < 0)
    next = next.map(
      (value) => light + ((value - light) * light) / (light - low),
    );
  if (high > 1)
    next = next.map(
      (value) => light + ((value - light) * (1 - light)) / (high - light),
    );
  return next.map(clamp);
};
const setLuminance = (rgb: number[], light: number) =>
  clipColor(rgb.map((value) => value + light - luminance(rgb)));
const setSaturation = (rgb: number[], target: number) => {
  const order = [0, 1, 2].sort((a, b) => rgb[a] - rgb[b]),
    [minimum, middle, maximum] = order,
    next = [...rgb];
  if (next[maximum] > next[minimum]) {
    next[middle] =
      ((next[middle] - next[minimum]) * target) /
      (next[maximum] - next[minimum]);
    next[maximum] = target;
  } else next[middle] = next[maximum] = 0;
  next[minimum] = 0;
  return next;
};
export function rangeAlpha(value: number, [low, start, end, high]: BlendRange) {
  if (value < low || value > high) return 0;
  return Math.min(
    start === low ? 1 : clamp((value - low) / (start - low)),
    high === end ? 1 : clamp((high - value) / (high - end)),
  );
}
export function validBlendIf(value: unknown): value is BlendIf {
  if (!value || typeof value !== 'object') return false;
  const channel = (value as BlendIf).channel;
  return (
    (channel === undefined ||
      ['gray', 'red', 'green', 'blue'].includes(channel)) &&
    ['source', 'backdrop'].every((key) => {
      const a = (value as Record<string, unknown>)[key];
      return (
        Array.isArray(a) &&
        a.length === 4 &&
        a.every(
          (v, i) =>
            Number.isFinite(v) &&
            v >= 0 &&
            v <= 255 &&
            (i === 0 || v >= a[i - 1]),
        )
      );
    })
  );
}
export function blendChannel(b: number, s: number, mode: string): number {
  switch (mode) {
    case 'multiply':
      return b * s;
    case 'screen':
      return b + s - b * s;
    case 'overlay':
      return b <= 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s);
    case 'darken':
      return Math.min(b, s);
    case 'lighten':
      return Math.max(b, s);
    case 'color-dodge':
      return s >= 1 ? 1 : clamp(b / (1 - s));
    case 'color-burn':
      return s <= 0 ? 0 : 1 - clamp((1 - b) / s);
    case 'hard-light':
      return s <= 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s);
    case 'soft-light': {
      if (s <= 0.5) return b - (1 - 2 * s) * b * (1 - b);
      const d = b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b);
      return b + (2 * s - 1) * (d - b);
    }
    case 'difference':
      return Math.abs(b - s);
    case 'exclusion':
      return b + s - 2 * b * s;
    case 'linear-dodge':
      return Math.min(1, b + s);
    case 'linear-burn':
      return Math.max(0, b + s - 1);
    case 'subtract':
      return Math.max(0, b - s);
    case 'divide':
      return s === 0 ? 1 : Math.min(1, b / s);
    case 'linear-light':
      return clamp(b + 2 * s - 1);
    case 'pin-light':
      return s < 0.5 ? Math.min(b, 2 * s) : Math.max(b, 2 * s - 1);
    case 'vivid-light':
      return s < 0.5
        ? s === 0
          ? 0
          : 1 - Math.min(1, (1 - b) / (2 * s))
        : s === 1
          ? 1
          : Math.min(1, b / (2 * (1 - s)));
    case 'hard-mix':
      return b + s < 1 ? 0 : 1;
    default:
      return s;
  }
}
export function blendRgb(backdrop: number[], source: number[], mode: string) {
  if (mode === 'hue')
    return setLuminance(
      setSaturation(source, saturation(backdrop)),
      luminance(backdrop),
    );
  if (mode === 'saturation')
    return setLuminance(
      setSaturation(backdrop, saturation(source)),
      luminance(backdrop),
    );
  if (mode === 'color') return setLuminance(source, luminance(backdrop));
  if (mode === 'luminosity') return setLuminance(backdrop, luminance(source));
  if (mode === 'darker-color')
    return luminance(source) < luminance(backdrop) ? source : backdrop;
  if (mode === 'lighter-color')
    return luminance(source) > luminance(backdrop) ? source : backdrop;
  return backdrop.map((value, index) =>
    blendChannel(value, source[index], mode),
  );
}
export function blendRgbInSpace(
  backdrop: number[],
  source: number[],
  mode: string,
  space: BlendSpace,
) {
  const convertIn = (value: number) =>
      space === 'linear' ? srgbToLinear(clamp(value)) : clamp(value),
    convertOut = (value: number) =>
      space === 'linear' ? linearToSrgb(clamp(value)) : clamp(value);
  return blendRgb(backdrop.map(convertIn), source.map(convertIn), mode).map(
    convertOut,
  );
}
export type NormalizedRgba = [number, number, number, number];
export function compositePixel(
  backdrop: NormalizedRgba,
  source: NormalizedRgba,
  mode: string,
  blendSpace: BlendSpace = 'gamma',
): NormalizedRgba {
  const sourceAlpha = clamp(source[3]),
    backdropAlpha = clamp(backdrop[3]),
    alpha = sourceAlpha + backdropAlpha * (1 - sourceAlpha),
    preserveExtended = mode === 'source-over' && blendSpace === 'gamma',
    convertIn = (value: number) =>
      preserveExtended
        ? value
        : blendSpace === 'linear'
          ? srgbToLinear(clamp(value))
          : clamp(value),
    convertOut = (value: number) =>
      preserveExtended
        ? value
        : blendSpace === 'linear'
          ? linearToSrgb(clamp(value))
          : clamp(value),
    sourceRgb = source.slice(0, 3).map(convertIn),
    backdropRgb = backdrop.slice(0, 3).map(convertIn),
    blendedRgb = blendRgb(backdropRgb, sourceRgb, mode),
    output = sourceRgb.map((sourceValue, index) => {
      if (!alpha) return 0;
      const backdropValue = backdropRgb[index],
        composed =
          ((1 - sourceAlpha) * backdropAlpha * backdropValue +
            sourceAlpha *
              ((1 - backdropAlpha) * sourceValue +
                backdropAlpha * blendedRgb[index])) /
          alpha;
      return convertOut(composed);
    });
  return [output[0], output[1], output[2], alpha];
}
// Tile-sized reads bound temporary pixel arrays; source/backdrop remain full-resolution canvases.
export function compositePixels(
  target: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  mode: string,
  blendIf?: BlendIf,
  blendSpace: BlendSpace = 'gamma',
  precision: 'u8' | 'f16' = 'u8',
) {
  const sourceCtx = source.getContext('2d')!,
    custom = pixelBlendModes.has(mode) || blendSpace === 'linear';
  const read = (
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    if (precision === 'u8') return context.getImageData(x, y, width, height);
    const image = (
      context.getImageData as unknown as (
        x: number,
        y: number,
        width: number,
        height: number,
        settings: { colorSpace: string; pixelFormat: string },
      ) => ImageData
    )(x, y, width, height, {
      colorSpace: 'srgb',
      pixelFormat: 'rgba-float16',
    });
    return {
      data: Float32Array.from(image.data as unknown as ArrayLike<number>),
      width,
      height,
    };
  };
  const write = (
    context: CanvasRenderingContext2D,
    image: {
      data: Uint8ClampedArray | Float32Array;
      width: number;
      height: number;
    },
    x: number,
    y: number,
  ) => {
    if (image.data instanceof Uint8ClampedArray) {
      context.putImageData(
        new ImageData(
          Uint8ClampedArray.from(image.data),
          image.width,
          image.height,
        ),
        x,
        y,
      );
      return;
    }
    const FloatImageData = ImageData as unknown as {
      new (
        data: Float16Array,
        width: number,
        height: number,
        settings: { colorSpace: string; pixelFormat: string },
      ): ImageData;
    };
    context.putImageData(
      new FloatImageData(
        new Float16Array(image.data),
        image.width,
        image.height,
        { colorSpace: 'srgb', pixelFormat: 'rgba-float16' },
      ),
      x,
      y,
    );
  };
  for (let y = 0; y < source.height; y += 256)
    for (let x = 0; x < source.width; x += 256) {
      const w = Math.min(256, source.width - x),
        h = Math.min(256, source.height - y),
        s = read(sourceCtx, x, y, w, h),
        b = read(target, x, y, w, h),
        maximum = precision === 'f16' ? 1 : 255;
      for (let i = 0; i < s.data.length; i += 4) {
        let sa = s.data[i + 3] / maximum;
        const ba = b.data[i + 3] / maximum;
        if (blendIf) {
          const channel = blendIf.channel ?? 'gray',
            index =
              channel === 'red'
                ? 0
                : channel === 'green'
                  ? 1
                  : channel === 'blue'
                    ? 2
                    : -1,
            sl =
              index < 0
                ? (0.299 * s.data[i] +
                    0.587 * s.data[i + 1] +
                    0.114 * s.data[i + 2]) *
                  (255 / maximum)
                : s.data[i + index] * (255 / maximum),
            bl =
              index < 0
                ? (0.299 * b.data[i] +
                    0.587 * b.data[i + 1] +
                    0.114 * b.data[i + 2]) *
                  (255 / maximum)
                : b.data[i + index] * (255 / maximum);
          sa *=
            rangeAlpha(sl, blendIf.source) *
            (ba === 0 ? 1 : rangeAlpha(bl, blendIf.backdrop));
          s.data[i + 3] = sa * maximum;
        }
        if (!custom) continue;
        if (mode === 'dissolve') {
          const p =
            (y + Math.floor(i / 4 / w)) * source.width + x + ((i / 4) % w);
          let seed = Math.imul(p ^ 0x9e3779b9, 0x85ebca6b);
          seed ^= seed >>> 13;
          sa = (seed >>> 0) / 4294967296 < sa ? 1 : 0;
        }
        const result = compositePixel(
          [
            b.data[i] / maximum,
            b.data[i + 1] / maximum,
            b.data[i + 2] / maximum,
            ba,
          ],
          [
            s.data[i] / maximum,
            s.data[i + 1] / maximum,
            s.data[i + 2] / maximum,
            sa,
          ],
          mode,
          blendSpace,
        );
        for (let c = 0; c < 3; c++) b.data[i + c] = result[c] * maximum;
        b.data[i + 3] = result[3] * maximum;
      }
      if (custom) write(target, b, x, y);
      else write(sourceCtx, s, x, y);
    }
  if (!custom) {
    target.save();
    target.globalAlpha = 1;
    target.globalCompositeOperation = mode as GlobalCompositeOperation;
    target.drawImage(source, 0, 0);
    target.restore();
  }
}
