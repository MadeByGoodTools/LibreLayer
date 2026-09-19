import type { Color, LayerTextData } from 'ag-psd';

export type PortableTextLayer = {
  content: string;
  color: string;
  originX: number;
  originY: number;
  paragraph: boolean;
  width: number;
  family: string;
  weight: number;
  style: 'normal' | 'italic' | 'oblique';
  stretch: number;
  size: number;
  tracking: number;
  kerning: boolean;
  leading: number;
  baseline: number;
  align: 'left' | 'center' | 'right' | 'justify';
  onPath: boolean;
  pathMode?: 'none' | 'along' | 'inside';
  warp: number;
  warpStyle?: 'none' | 'arc' | 'arch' | 'flag' | 'wave' | 'bulge' | 'fish';
  fit?: 'none' | 'shrink' | 'fill';
  boxHeight?: number;
  smallCaps: boolean;
  ligatures: boolean;
  direction: 'auto' | 'ltr' | 'rtl';
  language: string;
  underline: boolean;
  strike: boolean;
  indent: number;
  spaceBefore: number;
  spaceAfter: number;
};

const clampByte = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)));

function colorToHex(color: Color | undefined) {
  if (!color) return '#000000';
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

function hexToColor(value: string) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value);
  return match
    ? {
        r: parseInt(match[1], 16),
        g: parseInt(match[2], 16),
        b: parseInt(match[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function unsupportedPsdTextReasons(text: LayerTextData) {
  const reasons: string[] = [];
  if (text.orientation === 'vertical') reasons.push('vertical text');
  if (text.textPath) reasons.push('text on a path');
  if ((text.styleRuns?.length ?? 0) > 1) reasons.push('mixed character styles');
  if ((text.paragraphStyleRuns?.length ?? 0) > 1)
    reasons.push('mixed paragraph styles');
  return reasons;
}

export function psdTextToPortable(text: LayerTextData): PortableTextLayer {
  const style = { ...text.style, ...text.styleRuns?.[0]?.style };
  const paragraph = {
    ...text.paragraphStyle,
    ...text.paragraphStyleRuns?.[0]?.style,
  };
  const transform = text.transform ?? [1, 0, 0, 1, 0, 0];
  const box = text.boxBounds ?? [
    0,
    0,
    400,
    Math.max(1, style.fontSize ?? 16) * 2,
  ];
  const size = Math.max(1, style.fontSize ?? 16);
  const justification = paragraph.justification ?? 'left';
  const align =
    justification === 'left' ||
    justification === 'right' ||
    justification === 'center'
      ? justification
      : 'justify';
  const warpStyle = text.warp?.style;
  return {
    content: text.text.replace(/\r/g, '\n'),
    color: colorToHex(style.fillColor),
    originX: transform[4] ?? 0,
    originY: transform[5] ?? 0,
    paragraph: text.shapeType === 'box',
    width: Math.max(1, box[2] - box[0]),
    family: style.font?.name ?? 'Arial',
    weight: style.fauxBold ? 700 : 400,
    style: style.fauxItalic ? 'italic' : 'normal',
    stretch: Math.max(0.1, (style.horizontalScale ?? 100) / 100),
    size,
    tracking: ((style.tracking ?? 0) * size) / 1000,
    kerning: style.autoKerning ?? true,
    leading: style.autoLeading
      ? 1.2
      : Math.max(0.1, (style.leading ?? size * 1.2) / size),
    baseline: style.baselineShift ?? 0,
    align,
    onPath: false,
    pathMode: 'none',
    warp: text.warp?.value ?? 0,
    warpStyle:
      warpStyle === 'arc' ||
      warpStyle === 'arch' ||
      warpStyle === 'flag' ||
      warpStyle === 'wave' ||
      warpStyle === 'bulge' ||
      warpStyle === 'fish'
        ? warpStyle
        : 'none',
    fit: 'none',
    boxHeight: Math.max(1, box[3] - box[1]),
    smallCaps: style.fontCaps === 2,
    ligatures: style.ligatures ?? true,
    direction: style.characterDirection === 1 ? 'rtl' : 'auto',
    language: 'und',
    underline: style.underline ?? false,
    strike: style.strikethrough ?? false,
    indent: paragraph.startIndent ?? 0,
    spaceBefore: paragraph.spaceBefore ?? 0,
    spaceAfter: paragraph.spaceAfter ?? 0,
  };
}

export function portableTextToPsd(value: PortableTextLayer): LayerTextData {
  const justification =
    value.align === 'justify' ? 'justify-left' : value.align;
  return {
    text: value.content,
    transform: [1, 0, 0, 1, value.originX, value.originY],
    orientation: 'horizontal',
    antiAlias: 'smooth',
    shapeType: value.paragraph ? 'box' : 'point',
    pointBase: value.paragraph ? undefined : [0, 0],
    boxBounds: value.paragraph
      ? [0, 0, value.width, value.boxHeight ?? value.size * 2]
      : undefined,
    style: {
      font: { name: value.family || 'Arial' },
      fontSize: value.size,
      fauxBold: value.weight >= 600,
      fauxItalic: value.style !== 'normal',
      horizontalScale: value.stretch * 100,
      verticalScale: 100,
      tracking: Math.round((value.tracking / Math.max(1, value.size)) * 1000),
      autoKerning: value.kerning,
      autoLeading: false,
      leading: value.leading * value.size,
      baselineShift: value.baseline,
      fontCaps: value.smallCaps ? 2 : 0,
      underline: value.underline,
      strikethrough: value.strike,
      ligatures: value.ligatures,
      characterDirection: value.direction === 'rtl' ? 1 : 0,
      fillColor: hexToColor(value.color),
    },
    paragraphStyle: {
      justification,
      startIndent: value.indent,
      spaceBefore: value.spaceBefore,
      spaceAfter: value.spaceAfter,
    },
    warp: {
      style: value.warpStyle ?? 'none',
      value: value.warp,
      rotate: 'horizontal',
    },
  };
}
