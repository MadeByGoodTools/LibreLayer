export type ReferenceFilter =
  | 'blur-gallery'
  | 'lens-blur'
  | 'surface-blur'
  | 'smart-sharpen'
  | 'high-pass'
  | 'noise';

const clampByte = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)));

const validate = (data: Uint8ClampedArray, width: number, height: number) => {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    data.length !== width * height * 4
  )
    throw Error('Filter image dimensions are invalid');
};

const boxBlur = (
  source: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
) => {
  radius = Math.max(0, Math.min(32, Math.round(radius)));
  if (!radius) return new Uint8ClampedArray(source);
  const horizontal = new Float32Array(source.length),
    output = new Uint8ClampedArray(source.length),
    span = radius * 2 + 1;
  for (let y = 0; y < height; y++)
    for (let channel = 0; channel < 3; channel++) {
      let sum = 0;
      for (let x = -radius; x <= radius; x++)
        sum +=
          source[
            (y * width + Math.max(0, Math.min(width - 1, x))) * 4 + channel
          ];
      for (let x = 0; x < width; x++) {
        horizontal[(y * width + x) * 4 + channel] = sum / span;
        const remove = Math.max(0, x - radius),
          add = Math.min(width - 1, x + radius + 1);
        sum +=
          source[(y * width + add) * 4 + channel] -
          source[(y * width + remove) * 4 + channel];
      }
    }
  for (let x = 0; x < width; x++)
    for (let channel = 0; channel < 3; channel++) {
      let sum = 0;
      for (let y = -radius; y <= radius; y++)
        sum +=
          horizontal[
            (Math.max(0, Math.min(height - 1, y)) * width + x) * 4 + channel
          ];
      for (let y = 0; y < height; y++) {
        output[(y * width + x) * 4 + channel] = clampByte(sum / span);
        const remove = Math.max(0, y - radius),
          add = Math.min(height - 1, y + radius + 1);
        sum +=
          horizontal[(add * width + x) * 4 + channel] -
          horizontal[(remove * width + x) * 4 + channel];
      }
    }
  for (let index = 3; index < source.length; index += 4)
    output[index] = source[index];
  return output;
};

const gaussianApprox = (
  source: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
) => {
  let result = new Uint8ClampedArray(source);
  const passRadius = Math.max(1, Math.round(radius / 1.7));
  for (let pass = 0; pass < 3; pass++)
    result = boxBlur(result, width, height, passRadius);
  return result;
};

export function applyReferenceFilter(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  operation: ReferenceFilter,
  amount: number,
  secondary: number,
) {
  validate(source, width, height);
  const strength = Math.max(0, Math.min(1, amount / 100)),
    radius = Math.max(1, Math.round(1 + strength * 15)),
    threshold =
      operation === 'noise'
        ? Math.round(64 + strength * 192)
        : Math.max(2, Math.round(4 + secondary * 1.2)),
    blurred = gaussianApprox(source, width, height, radius),
    output = new Uint8ClampedArray(source.length),
    focus = Math.max(0, Math.min(1, secondary / 100));
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4,
        luma =
          source[index] * 0.2126 +
          source[index + 1] * 0.7152 +
          source[index + 2] * 0.0722,
        blurLuma =
          blurred[index] * 0.2126 +
          blurred[index + 1] * 0.7152 +
          blurred[index + 2] * 0.0722;
      let mix = strength;
      if (operation === 'blur-gallery') {
        const distance = Math.abs(y / Math.max(1, height - 1) - focus);
        mix = Math.max(0, Math.min(1, (distance - 0.12) * 2.3)) * strength;
      } else if (operation === 'lens-blur') {
        const depth = luma / 255;
        mix =
          Math.max(0, Math.min(1, Math.abs(depth - focus) * 2.4)) * strength;
      } else if (operation === 'surface-blur' || operation === 'noise') {
        const edge = Math.abs(luma - blurLuma);
        mix = Math.max(0, 1 - edge / threshold) * strength;
      }
      for (let channel = 0; channel < 3; channel++) {
        const original = source[index + channel],
          soft = blurred[index + channel];
        output[index + channel] =
          operation === 'smart-sharpen'
            ? clampByte(original + (original - soft) * strength * 2.25)
            : operation === 'high-pass'
              ? clampByte(128 + (original - soft) * (0.7 + strength * 2.3))
              : clampByte(original + (soft - original) * mix);
      }
      output[index + 3] = source[index + 3];
    }
  return output;
}
