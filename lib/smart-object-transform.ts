import type { WarpMode, WarpPreset } from './warp-engine';

export type SmartObjectTransform = {
  mode: WarpMode;
  horizontal: number;
  vertical: number;
  preset?: WarpPreset;
};

const modes = new Set<WarpMode>([
  'skew',
  'distort',
  'perspective',
  'warp',
  'mesh',
  'split',
  'cylindrical',
  'puppet',
  'perspective-warp',
  'preset-warp',
]);
const presets = new Set<WarpPreset>(['arc', 'flag', 'fisheye', 'twist']);
const clamp = (value: number) => Math.max(-100, Math.min(100, value));

export const defaultSmartObjectTransform = (): SmartObjectTransform => ({
  mode: 'skew',
  horizontal: 0,
  vertical: 0,
});

export const isSmartObjectTransform = (
  value: unknown,
): value is SmartObjectTransform => {
  if (!value || typeof value !== 'object') return false;
  const recipe = value as Partial<SmartObjectTransform>;
  return (
    modes.has(recipe.mode as WarpMode) &&
    Number.isFinite(recipe.horizontal) &&
    Math.abs(recipe.horizontal ?? 0) <= 100 &&
    Number.isFinite(recipe.vertical) &&
    Math.abs(recipe.vertical ?? 0) <= 100 &&
    (recipe.preset === undefined || presets.has(recipe.preset))
  );
};

export const normalizeSmartObjectTransform = (
  value?: Partial<SmartObjectTransform>,
): SmartObjectTransform => ({
  mode: modes.has(value?.mode as WarpMode) ? value!.mode! : 'skew',
  horizontal: clamp(Number.isFinite(value?.horizontal) ? value!.horizontal! : 0),
  vertical: clamp(Number.isFinite(value?.vertical) ? value!.vertical! : 0),
  ...(value?.mode === 'preset-warp'
    ? { preset: presets.has(value.preset as WarpPreset) ? value.preset : 'arc' }
    : {}),
});

export const hasSmartObjectTransform = (value?: SmartObjectTransform) =>
  !!value && (value.horizontal !== 0 || value.vertical !== 0);
