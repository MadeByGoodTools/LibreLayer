import type { VectorContent } from 'ag-psd';
import {
  normalizeFillLayerRecipe,
  type FillLayerRecipe,
} from './fill-layer.ts';

const clampByte = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)));

function colorToHex(color: Extract<VectorContent, { type: 'color' }>['color']) {
  if ('r' in color)
    return `#${[color.r, color.g, color.b]
      .map((value) => clampByte(value).toString(16).padStart(2, '0'))
      .join('')}`;
  if ('fr' in color)
    return `#${[color.fr, color.fg, color.fb]
      .map((value) =>
        clampByte(value * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')}`;
  return '#000000';
}

function hexToRgb(value: string) {
  const normalized = normalizeFillLayerRecipe({ color: value }).color;
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

export function psdSolidFillToRecipe(
  fill: Extract<VectorContent, { type: 'color' }>,
): FillLayerRecipe {
  return normalizeFillLayerRecipe({
    mode: 'solid',
    color: colorToHex(fill.color),
  });
}

export function fillRecipeToPsdSolid(
  recipe: FillLayerRecipe,
): Extract<VectorContent, { type: 'color' }> | undefined {
  const normalized = normalizeFillLayerRecipe(recipe);
  return normalized.mode === 'solid'
    ? { type: 'color', color: hexToRgb(normalized.color) }
    : undefined;
}

export function psdGradientFillToRecipe(
  fill: Extract<VectorContent, { type: 'solid' }>,
): FillLayerRecipe {
  const first = fill.colorStops[0]?.color,
    last = fill.colorStops.at(-1)?.color;
  return normalizeFillLayerRecipe({
    mode: 'gradient',
    color: first ? colorToHex(first) : '#000000',
    color2: last ? colorToHex(last) : '#ffffff',
    angle: fill.angle ?? 0,
    scale: fill.scale ?? 100,
    offsetX: fill.offset?.x ?? 0,
    offsetY: fill.offset?.y ?? 0,
  });
}

export function fillRecipeToPsdGradient(
  recipe: FillLayerRecipe,
): Extract<VectorContent, { type: 'solid' }> | undefined {
  const normalized = normalizeFillLayerRecipe(recipe);
  if (normalized.mode !== 'gradient') return undefined;
  return {
    type: 'solid',
    name: 'LibreLayer gradient',
    style: 'linear',
    angle: normalized.angle,
    scale: normalized.scale,
    offset: { x: normalized.offsetX, y: normalized.offsetY },
    colorStops: [
      { color: hexToRgb(normalized.color), location: 0, midpoint: 50 },
      { color: hexToRgb(normalized.color2), location: 4096, midpoint: 50 },
    ],
    opacityStops: [
      { opacity: 1, location: 0, midpoint: 50 },
      { opacity: 1, location: 4096, midpoint: 50 },
    ],
  };
}

export function psdFillToRecipe(fill: VectorContent) {
  if (fill.type === 'color') return psdSolidFillToRecipe(fill);
  if (fill.type === 'solid') return psdGradientFillToRecipe(fill);
  return undefined;
}

export function fillRecipeToPsd(recipe: FillLayerRecipe) {
  return fillRecipeToPsdSolid(recipe) ?? fillRecipeToPsdGradient(recipe);
}
