export type LayoutBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type Artboard = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  background: string;
  exportEnabled: boolean;
};

export type FrameRecipe = {
  shape: 'rectangle' | 'ellipse';
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
};

const finite = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const normalizeArtboard = (
  value: Partial<Artboard>,
  documentWidth: number,
  documentHeight: number,
): Artboard => ({
  id: typeof value.id === 'string' && value.id ? value.id : crypto.randomUUID(),
  name:
    typeof value.name === 'string' && value.name.trim()
      ? value.name.trim().slice(0, 80)
      : 'Artboard',
  x: Math.max(0, Math.min(documentWidth - 1, Math.round(finite(value.x, 0)))),
  y: Math.max(0, Math.min(documentHeight - 1, Math.round(finite(value.y, 0)))),
  w: Math.max(
    1,
    Math.min(
      documentWidth -
        Math.max(0, Math.min(documentWidth - 1, finite(value.x, 0))),
      Math.round(finite(value.w, documentWidth)),
    ),
  ),
  h: Math.max(
    1,
    Math.min(
      documentHeight -
        Math.max(0, Math.min(documentHeight - 1, finite(value.y, 0))),
      Math.round(finite(value.h, documentHeight)),
    ),
  ),
  background:
    typeof value.background === 'string' &&
    /^#[0-9a-f]{6}$/i.test(value.background)
      ? value.background
      : '#ffffff',
  exportEnabled: value.exportEnabled !== false,
});

export const normalizeFrame = (
  value: Partial<FrameRecipe>,
  documentWidth: number,
  documentHeight: number,
): FrameRecipe => {
  const x = Math.max(
      0,
      Math.min(documentWidth - 1, Math.round(finite(value.x, 0))),
    ),
    y = Math.max(
      0,
      Math.min(documentHeight - 1, Math.round(finite(value.y, 0))),
    );
  return {
    shape: value.shape === 'ellipse' ? 'ellipse' : 'rectangle',
    x,
    y,
    w: Math.max(
      1,
      Math.min(
        documentWidth - x,
        Math.round(finite(value.w, documentWidth - x)),
      ),
    ),
    h: Math.max(
      1,
      Math.min(
        documentHeight - y,
        Math.round(finite(value.h, documentHeight - y)),
      ),
    ),
    radius: Math.max(0, Math.min(1000, finite(value.radius, 0))),
  };
};

export const smartSpacingMoves = (
  items: { id: string; bounds: LayoutBounds }[],
  axis: 'horizontal' | 'vertical',
) => {
  if (items.length < 3) return new Map<string, number>();
  const startKey = axis === 'horizontal' ? 'left' : 'top',
    endKey = axis === 'horizontal' ? 'right' : 'bottom',
    sorted = [...items].sort(
      (first, second) => first.bounds[startKey] - second.bounds[startKey],
    ),
    totalSize = sorted.reduce(
      (sum, item) => sum + item.bounds[endKey] - item.bounds[startKey],
      0,
    ),
    available =
      sorted.at(-1)!.bounds[endKey] - sorted[0].bounds[startKey] - totalSize,
    gap = available / (sorted.length - 1),
    moves = new Map<string, number>();
  let cursor = sorted[0].bounds[startKey];
  for (const item of sorted) {
    moves.set(item.id, cursor - item.bounds[startKey]);
    cursor += item.bounds[endKey] - item.bounds[startKey] + gap;
  }
  return moves;
};

export const multiScaleExportPlan = (artboards: Artboard[], scales: number[]) =>
  artboards
    .filter((artboard) => artboard.exportEnabled)
    .flatMap((artboard) =>
      [...new Set(scales)]
        .filter((scale) => Number.isInteger(scale) && scale >= 1 && scale <= 4)
        .sort((a, b) => a - b)
        .map((scale) => ({
          artboardId: artboard.id,
          name: `${artboard.name.replace(/[^a-z0-9_-]+/gi, '-') || 'artboard'}${scale === 1 ? '' : `@${scale}x`}.png`,
          scale,
          width: artboard.w * scale,
          height: artboard.h * scale,
        })),
    );
