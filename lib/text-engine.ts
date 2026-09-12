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

export type TextPathPoint = { x: number; y: number };

export const layoutGlyphsOnPath = (
  advances: number[],
  points: TextPathPoint[],
  startOffset = 0,
) => {
  if (points.length < 2 || advances.some((value) => value < 0 || !Number.isFinite(value)))
    return [];
  const segments = points.slice(1).map((point, index) => {
      const from = points[index],
        length = Math.hypot(point.x - from.x, point.y - from.y);
      return { from, to: point, length };
    }),
    total = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (!total) return [];
  let cursor = Math.max(0, startOffset);
  return advances.map((advance) => {
    const center = Math.min(total, cursor + advance / 2);
    let distance = center,
      segment = segments[segments.length - 1];
    for (const candidate of segments) {
      segment = candidate;
      if (distance <= candidate.length) break;
      distance -= candidate.length;
    }
    const ratio = segment.length ? Math.min(1, distance / segment.length) : 0,
      x = segment.from.x + (segment.to.x - segment.from.x) * ratio,
      y = segment.from.y + (segment.to.y - segment.from.y) * ratio,
      angle = Math.atan2(segment.to.y - segment.from.y, segment.to.x - segment.from.x);
    cursor += advance;
    return { x, y, angle, visible: center <= total };
  });
};

export const fitTextSize = ({
  preferred,
  min,
  max,
  fits,
}: {
  preferred: number;
  min: number;
  max: number;
  fits: (size: number) => boolean;
}) => {
  let low = Math.max(1, Math.min(min, max)),
    high = Math.max(low, max),
    best = low;
  for (let iteration = 0; iteration < 14; iteration++) {
    const candidate = (low + high) / 2;
    if (fits(candidate)) {
      best = candidate;
      low = candidate;
    } else high = candidate;
  }
  return Math.max(min, Math.min(max, preferred > 0 && fits(preferred) ? preferred : best));
};

export type TextWarpStyle =
  | 'none'
  | 'arc'
  | 'arch'
  | 'flag'
  | 'wave'
  | 'bulge'
  | 'fish';

export const textWarpTransform = (
  style: TextWarpStyle,
  progress: number,
  bend: number,
) => {
  const t = Math.max(0, Math.min(1, progress)),
    strength = bend;
  if (style === 'arc')
    return { y: -Math.sin(t * Math.PI) * strength, rotation: (0.5 - t) * strength * 0.012, scaleY: 1 };
  if (style === 'arch')
    return { y: -(1 - Math.pow(t * 2 - 1, 2)) * strength, rotation: 0, scaleY: 1 };
  if (style === 'flag')
    return { y: Math.sin(t * Math.PI * 2) * strength, rotation: Math.cos(t * Math.PI * 2) * strength * 0.01, scaleY: 1 };
  if (style === 'wave')
    return { y: Math.sin(t * Math.PI * 4) * strength, rotation: 0, scaleY: 1 };
  if (style === 'bulge')
    return { y: 0, rotation: 0, scaleY: Math.max(0.15, 1 + Math.sin(t * Math.PI) * strength / 100) };
  if (style === 'fish')
    return { y: Math.sin(t * Math.PI) * strength * (t - 0.5), rotation: (t - 0.5) * strength * 0.008, scaleY: 1 };
  return { y: 0, rotation: 0, scaleY: 1 };
};

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
