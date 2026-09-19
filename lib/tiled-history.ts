import type { WorkingSurface } from './working-depth.ts';

const TILE = 256;
export type DirtyRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type ImageTile = {
  w: number;
  h: number;
  solid?: number;
  bytes?: Uint8ClampedArray<ArrayBuffer>;
};
export type TiledImage = { width: number; height: number; tiles: ImageTile[] };
export type HistorySurface = {
  id: string;
  pixels: TiledImage;
  mask?: TiledImage;
  precision?: WorkingSurface;
};
export function dirtyTileIndices(
  width: number,
  height: number,
  dirty: DirtyRegion,
) {
  if (
    !Number.isFinite(dirty.x) ||
    !Number.isFinite(dirty.y) ||
    !Number.isFinite(dirty.width) ||
    !Number.isFinite(dirty.height) ||
    dirty.width <= 0 ||
    dirty.height <= 0
  )
    return new Set<number>();
  const columns = Math.ceil(width / TILE),
    rows = Math.ceil(height / TILE),
    left = Math.max(0, Math.floor(dirty.x / TILE)),
    top = Math.max(0, Math.floor(dirty.y / TILE)),
    right = Math.min(
      columns - 1,
      Math.floor((dirty.x + dirty.width - Number.EPSILON) / TILE),
    ),
    bottom = Math.min(
      rows - 1,
      Math.floor((dirty.y + dirty.height - Number.EPSILON) / TILE),
    ),
    indices = new Set<number>();
  if (right < left || bottom < top) return indices;
  for (let row = top; row <= bottom; row++)
    for (let column = left; column <= right; column++)
      indices.add(row * columns + column);
  return indices;
}
function equal(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  if (a.length !== b.length) return false;
  const av = new Uint32Array(a.buffer, a.byteOffset, a.length / 4),
    bv = new Uint32Array(b.buffer, b.byteOffset, b.length / 4);
  for (let i = 0; i < av.length; i++) if (av[i] !== bv[i]) return false;
  return true;
}
export function captureTiles(
  canvas: HTMLCanvasElement,
  previous?: TiledImage,
  dirty?: DirtyRegion,
): TiledImage {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx)
    throw Error('Canvas memory is unavailable. Close another document.');
  const width = canvas.width,
    height = canvas.height,
    tiles: ImageTile[] = [];
  const compatible = previous?.width === width && previous?.height === height,
    dirtyIndices =
      compatible && dirty ? dirtyTileIndices(width, height, dirty) : null;
  for (let y = 0; y < height; y += TILE)
    for (let x = 0; x < width; x += TILE) {
      const index = tiles.length,
        old = compatible ? previous!.tiles[index] : undefined;
      if (old && dirtyIndices && !dirtyIndices.has(index)) {
        tiles.push(old);
        continue;
      }
      const w = Math.min(TILE, width - x),
        h = Math.min(TILE, height - y),
        image = ctx.getImageData(x, y, w, h),
        words = new Uint32Array(image.data.buffer),
        first = words[0];
      let solid = true;
      for (let i = 1; i < words.length; i++)
        if (words[i] !== first) {
          solid = false;
          break;
        }
      if (solid)
        tiles.push(old?.solid === first ? old : { w, h, solid: first });
      else
        tiles.push(
          old?.bytes && equal(image.data, old.bytes)
            ? old
            : { w, h, bytes: image.data },
        );
    }
  return { width, height, tiles };
}
export function restoreTiles(image: TiledImage): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw Error('Canvas memory is unavailable.');
  let i = 0;
  for (let y = 0; y < image.height; y += TILE)
    for (let x = 0; x < image.width; x += TILE) {
      const tile = image.tiles[i++];
      if (tile.solid !== undefined) {
        const bytes = new Uint8ClampedArray(tile.w * tile.h * 4);
        new Uint32Array(bytes.buffer).fill(tile.solid);
        ctx.putImageData(new ImageData(bytes, tile.w, tile.h), x, y);
      } else ctx.putImageData(new ImageData(tile.bytes!, tile.w, tile.h), x, y);
    }
  return canvas;
}
export function historyBytes(
  frames: { surfaces: HistorySurface[]; selection?: TiledImage }[],
) {
  const seen = new Set<ImageTile>(),
    precisionSeen = new Set<WorkingSurface>();
  let bytes = 0;
  for (const frame of frames) {
    for (const surface of frame.surfaces) {
      for (const image of [surface.pixels, surface.mask])
        if (image)
          for (const tile of image.tiles)
            if (!seen.has(tile)) {
              seen.add(tile);
              bytes += (tile.bytes?.byteLength ?? 4) + 32;
            }
      if (surface.precision && !precisionSeen.has(surface.precision)) {
        precisionSeen.add(surface.precision);
        bytes += surface.precision.data.byteLength + 64;
      }
    }
    if (frame.selection)
      for (const tile of frame.selection.tiles)
        if (!seen.has(tile)) {
          seen.add(tile);
          bytes += (tile.bytes?.byteLength ?? 4) + 32;
        }
  }
  return bytes;
}
