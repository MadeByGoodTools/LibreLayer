export type TextDirection = 'auto' | 'ltr' | 'rtl';
export type TextStyle = 'normal' | 'italic' | 'oblique';

const RTL_SCRIPT = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefc]/;

export const resolveTextDirection = (
  content: string,
  direction: TextDirection,
): 'ltr' | 'rtl' => {
  if (direction !== 'auto') return direction;
  return RTL_SCRIPT.test(content) ? 'rtl' : 'ltr';
};

export const canvasFont = ({
  family,
  size,
  weight,
  style = 'normal',
}: {
  family: string;
  size: number;
  weight: number;
  style?: TextStyle;
}) => {
  const safeFamily = family.includes(' ') ? `"${family.replaceAll('"', '')}"` : family;
  return `${style} ${Math.round(weight)} ${Math.max(1, size)}px ${safeFamily}`;
};

export const canvasFontStretch = (stretch: number) => {
  if (stretch <= 56) return 'ultra-condensed' as const;
  if (stretch <= 69) return 'extra-condensed' as const;
  if (stretch <= 81) return 'condensed' as const;
  if (stretch <= 94) return 'semi-condensed' as const;
  if (stretch < 106) return 'normal' as const;
  if (stretch < 119) return 'semi-expanded' as const;
  if (stretch < 137) return 'expanded' as const;
  if (stretch < 175) return 'extra-expanded' as const;
  return 'ultra-expanded' as const;
};

export const canvasVariableFont = (
  options: Parameters<typeof canvasFont>[0] & { stretch: number },
) => {
  const base = canvasFont(options),
    [prefix, suffix] = base.split(/ (?=\d+(?:\.\d+)?px )/, 2);
  return `${prefix} ${Math.max(50, Math.min(200, options.stretch))}% ${suffix}`;
};

export const graphemes = (content: string, language = 'en') => {
  if (typeof Intl.Segmenter === 'function')
    return Array.from(
      new Intl.Segmenter(language, { granularity: 'grapheme' }).segment(content),
      (part) => part.segment,
    );
  return Array.from(content);
};

export const shouldDrawShapedRun = ({
  tracking,
  justifyExtra,
  onPath,
  warp,
}: {
  tracking: number;
  justifyExtra: number;
  onPath: boolean;
  warp: number;
}) => tracking === 0 && justifyExtra === 0 && !onPath && warp === 0;

export const languageOptions = [
  ['en', 'English'],
  ['fr', 'French'],
  ['es', 'Spanish'],
  ['de', 'German'],
  ['ar', 'Arabic'],
  ['he', 'Hebrew'],
  ['hi', 'Hindi'],
  ['ja', 'Japanese'],
  ['ko', 'Korean'],
  ['zh', 'Chinese'],
] as const;
