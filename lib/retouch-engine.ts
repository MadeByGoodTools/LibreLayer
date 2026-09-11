export function correctRedEyePixels(pixels: Uint8ClampedArray) {
  const output = new Uint8ClampedArray(pixels);
  for (let index = 0; index < output.length; index += 4) {
    const red = output[index],
      green = output[index + 1],
      blue = output[index + 2],
      neutral = (green + blue) / 2,
      dominance = red - Math.max(green, blue);
    if (dominance < 18 || red < neutral * 1.22) continue;
    const correction = Math.min(1, dominance / 110),
      target = neutral * 0.92;
    output[index] = Math.round(red * (1 - correction) + target * correction);
  }
  return output;
}

export function highFrequencyPixels(
  original: Uint8ClampedArray,
  softened: Uint8ClampedArray,
) {
  if (original.length !== softened.length)
    throw Error('Frequency buffers must have matching lengths');
  const output = new Uint8ClampedArray(original.length);
  for (let index = 0; index < output.length; index += 4) {
    for (let channel = 0; channel < 3; channel++)
      output[index + channel] = Math.max(
        0,
        Math.min(
          255,
          128 + (original[index + channel] - softened[index + channel]) / 2,
        ),
      );
    output[index + 3] = original[index + 3];
  }
  return output;
}
