export function precisionMultiplier(shiftKey: boolean, altKey: boolean) {
  return altKey ? 0.1 : shiftKey ? 10 : 1;
}

export function clampPrecisionValue(
  value: number,
  min: number,
  max: number,
  step: number,
) {
  if (![value, min, max, step].every(Number.isFinite) || max < min || step <= 0)
    throw new Error('Invalid precision control bounds');
  const decimals = Math.max(0, `${step}`.split('.')[1]?.length ?? 0);
  return Number(Math.max(min, Math.min(max, value)).toFixed(decimals + 1));
}

export function scrubPrecisionValue(
  start: number,
  pixels: number,
  step: number,
  min: number,
  max: number,
  shiftKey = false,
  altKey = false,
) {
  return clampPrecisionValue(
    start + pixels * step * precisionMultiplier(shiftKey, altKey),
    min,
    max,
    step,
  );
}

export function replacePrecisionValue(
  values: readonly number[],
  index: number,
  value: number,
) {
  if (index < 0 || index >= values.length)
    throw new Error('Invalid precision control index');
  return values.map((item, itemIndex) =>
    itemIndex === index ? value : item,
  );
}
