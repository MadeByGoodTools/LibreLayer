export type EffectContour = 'linear' | 'smooth' | 'cone' | 'ring';

export type LayerEffects = {
  dropShadow: boolean;
  innerShadow: boolean;
  outerGlow: boolean;
  innerGlow: boolean;
  bevel: boolean;
  satin: boolean;
  colorOverlay: boolean;
  gradientOverlay: boolean;
  patternOverlay: boolean;
  stroke: boolean;
  color: string;
  secondaryColor: string;
  opacity: number;
  size: number;
  distance: number;
  angle: number;
  useGlobalLight: boolean;
  scale: number;
  contour: EffectContour;
};

export const defaultLayerEffects = (): LayerEffects => ({
  dropShadow: true,
  innerShadow: false,
  outerGlow: false,
  innerGlow: false,
  bevel: false,
  satin: false,
  colorOverlay: false,
  gradientOverlay: false,
  patternOverlay: false,
  stroke: false,
  color: '#000000',
  secondaryColor: '#ffffff',
  opacity: 55,
  size: 12,
  distance: 10,
  angle: 135,
  useGlobalLight: true,
  scale: 100,
  contour: 'smooth',
});

const color = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : fallback;
const number = (value: unknown, fallback: number, min: number, max: number) =>
  Math.max(
    min,
    Math.min(
      max,
      typeof value === 'number' && Number.isFinite(value) ? value : fallback,
    ),
  );

export const normalizeLayerEffects = (
  value?: Partial<LayerEffects>,
): LayerEffects => {
  const defaults = defaultLayerEffects(),
    contour = ['linear', 'smooth', 'cone', 'ring'].includes(
      value?.contour ?? '',
    )
      ? (value!.contour as EffectContour)
      : defaults.contour;
  return {
    ...defaults,
    ...Object.fromEntries(
      (
        [
          'dropShadow',
          'innerShadow',
          'outerGlow',
          'innerGlow',
          'bevel',
          'satin',
          'colorOverlay',
          'gradientOverlay',
          'patternOverlay',
          'stroke',
          'useGlobalLight',
        ] as const
      ).map((key) => [
        key,
        typeof value?.[key] === 'boolean' ? value[key] : defaults[key],
      ]),
    ),
    color: color(value?.color, defaults.color),
    secondaryColor: color(value?.secondaryColor, defaults.secondaryColor),
    opacity: number(value?.opacity, defaults.opacity, 0, 100),
    size: number(value?.size, defaults.size, 0, 250),
    distance: number(value?.distance, defaults.distance, 0, 500),
    angle: number(value?.angle, defaults.angle, -360, 360),
    scale: number(value?.scale, defaults.scale, 1, 1000),
    contour,
  } as LayerEffects;
};

export const effectOffset = (angle: number, distance: number, scale = 100) => {
  const radians = ((angle - 180) * Math.PI) / 180,
    length = (distance * scale) / 100;
  return {
    x: Math.cos(radians) * length,
    y: Math.sin(radians) * length,
  };
};

export const effectContourAlpha = (alpha: number, contour: EffectContour) => {
  const value = Math.max(0, Math.min(1, alpha));
  if (contour === 'linear') return value;
  if (contour === 'smooth') return value * value * (3 - 2 * value);
  if (contour === 'cone') return Math.max(0, 1 - Math.abs(value * 2 - 1));
  return Math.max(0, Math.min(1, Math.sin(value * Math.PI * 2) * 0.5 + 0.5));
};
