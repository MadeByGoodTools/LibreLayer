export type HdrPreviewMode = 'auto' | 'sdr' | 'highlights';

export const normalizeHdrPreviewMode = (value: unknown): HdrPreviewMode =>
  value === 'sdr' || value === 'highlights' ? value : 'auto';

const finitePositive = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

const extendedSrgb = (value: number) => {
  const sign = value < 0 ? -1 : 1,
    magnitude = Math.abs(value);
  return (
    sign *
    (magnitude <= 0.0031308
      ? magnitude * 12.92
      : 1.055 * magnitude ** (1 / 2.4) - 0.055)
  );
};

const sdrToneMap = (value: number) => {
  const safe = finitePositive(value),
    mapped = safe / (1 + safe);
  return extendedSrgb(mapped);
};

export const createHdrPreviewPixels = (
  sceneLinear: Float32Array,
  mode: HdrPreviewMode,
  hdrDisplayAvailable: boolean,
) => {
  if (sceneLinear.length % 4)
    throw Error('HDR preview pixels must contain complete RGBA values.');
  const extended = mode === 'auto' && hdrDisplayAvailable,
    output = new Float32Array(sceneLinear.length);
  for (let index = 0; index < sceneLinear.length; index += 4) {
    const red = finitePositive(sceneLinear[index]),
      green = finitePositive(sceneLinear[index + 1]),
      blue = finitePositive(sceneLinear[index + 2]),
      clipped = Math.max(red, green, blue) > 1;
    if (mode === 'highlights' && clipped) {
      output[index] = 1;
      output[index + 1] = 0;
      output[index + 2] = 0.65;
    } else
      for (let channel = 0; channel < 3; channel++)
        output[index + channel] = extended
          ? extendedSrgb(finitePositive(sceneLinear[index + channel]))
          : sdrToneMap(sceneLinear[index + channel]);
    output[index + 3] = Math.max(
      0,
      Math.min(
        1,
        Number.isFinite(sceneLinear[index + 3]) ? sceneLinear[index + 3] : 0,
      ),
    );
  }
  return { pixels: output, extended };
};

export const hdrDisplayCapability = () => {
  const css =
      typeof CSS !== 'undefined' &&
      CSS.supports?.('dynamic-range-limit', 'no-limit'),
    media =
      typeof matchMedia !== 'undefined' &&
      matchMedia('(dynamic-range: high)').matches,
    float16 = typeof Float16Array !== 'undefined';
  return { css: Boolean(css), media: Boolean(media), float16 };
};
