export type BrushTipMetadata = {
  id: string;
  name: string;
  folder: string;
  tags: string[];
  favorite: boolean;
};

export const normalizeBrushTags = (value: string | string[]) =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : value.split(','))
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12),
    ),
  );

export const filterBrushTips = <T extends BrushTipMetadata>(
  tips: T[],
  query: string,
  folder: string,
  favoritesOnly: boolean,
) => {
  const needle = query.trim().toLowerCase();
  return tips.filter(
    (tip) =>
      (!favoritesOnly || tip.favorite) &&
      (folder === 'all' || tip.folder === folder) &&
      (!needle ||
        tip.name.toLowerCase().includes(needle) ||
        tip.folder.toLowerCase().includes(needle) ||
        tip.tags.some((tag) => tag.includes(needle))),
  );
};

export const maskAlphaFromRgba = (rgba: Uint8ClampedArray) => {
  if (rgba.length % 4) throw Error('Incomplete brush-tip pixels');
  const alpha = new Uint8ClampedArray(rgba.length / 4);
  for (let pixel = 0; pixel < alpha.length; pixel++) {
    const at = pixel * 4,
      luminance =
        rgba[at] * 0.2126 + rgba[at + 1] * 0.7152 + rgba[at + 2] * 0.0722;
    alpha[pixel] = Math.round(rgba[at + 3] * (1 - luminance / 255));
  }
  return alpha;
};

export const abrAlphaToRgba = (alpha: Uint8Array) => {
  const rgba = new Uint8ClampedArray(alpha.length * 4);
  for (let pixel = 0; pixel < alpha.length; pixel++) {
    const at = pixel * 4;
    rgba[at] = rgba[at + 1] = rgba[at + 2] = 255;
    rgba[at + 3] = 255 - alpha[pixel];
  }
  return rgba;
};
