export type FillLayerRecipe = {
  mode: 'solid' | 'gradient' | 'pattern';
  color: string;
  color2: string;
  angle: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  pattern: 'checker' | 'dots' | 'stripes';
};

const hex = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : fallback;
const bounded = (
  value: unknown,
  low: number,
  high: number,
  fallback: number,
) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(low, Math.min(high, number))
    : fallback;
};

export const defaultFillLayerRecipe = (): FillLayerRecipe => ({
  mode: 'solid',
  color: '#173a63',
  color2: '#f6c453',
  angle: 45,
  scale: 100,
  offsetX: 0,
  offsetY: 0,
  pattern: 'checker',
});

export const normalizeFillLayerRecipe = (
  input: Partial<FillLayerRecipe> = {},
): FillLayerRecipe => ({
  mode: ['solid', 'gradient', 'pattern'].includes(input.mode ?? '')
    ? input.mode!
    : 'solid',
  color: hex(input.color, '#173a63'),
  color2: hex(input.color2, '#f6c453'),
  angle: ((bounded(input.angle, -3600, 3600, 45) % 360) + 360) % 360,
  scale: bounded(input.scale, 10, 400, 100),
  offsetX: bounded(input.offsetX, -100, 100, 0),
  offsetY: bounded(input.offsetY, -100, 100, 0),
  pattern: ['checker', 'dots', 'stripes'].includes(input.pattern ?? '')
    ? input.pattern!
    : 'checker',
});

export const patternUsesSecondary = (
  x: number,
  y: number,
  recipe: Partial<FillLayerRecipe>,
) => {
  const value = normalizeFillLayerRecipe(recipe),
    unit = Math.max(2, 16 * (value.scale / 100)),
    px = (x - value.offsetX) / unit,
    py = (y - value.offsetY) / unit;
  if (value.pattern === 'stripes') return Math.floor(px + py) % 2 === 0;
  if (value.pattern === 'dots') {
    const dx = (((px % 1) + 1) % 1) - 0.5,
      dy = (((py % 1) + 1) % 1) - 0.5;
    return dx * dx + dy * dy <= 0.12;
  }
  return (Math.floor(px) + Math.floor(py)) % 2 === 0;
};
