export type MaskTransform = {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
};

export const defaultMaskTransform = (): MaskTransform => ({
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
});

const finite = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const normalizeMaskTransform = (
  value?: Partial<MaskTransform>,
): MaskTransform => {
  const defaults = defaultMaskTransform();
  return {
    x: Math.max(-1_000_000, Math.min(1_000_000, finite(value?.x, defaults.x))),
    y: Math.max(-1_000_000, Math.min(1_000_000, finite(value?.y, defaults.y))),
    rotation: Math.max(
      -360,
      Math.min(360, finite(value?.rotation, defaults.rotation)),
    ),
    scaleX: Math.max(
      0.01,
      Math.min(100, finite(value?.scaleX, defaults.scaleX)),
    ),
    scaleY: Math.max(
      0.01,
      Math.min(100, finite(value?.scaleY, defaults.scaleY)),
    ),
  };
};

export const maskTransformIsIdentity = (value?: Partial<MaskTransform>) => {
  const transform = normalizeMaskTransform(value);
  return (
    transform.x === 0 &&
    transform.y === 0 &&
    transform.rotation === 0 &&
    transform.scaleX === 1 &&
    transform.scaleY === 1
  );
};
