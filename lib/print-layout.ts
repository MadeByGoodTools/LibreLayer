export const PAPER_PRESETS = {
  letter: { label: 'US Letter', widthMm: 215.9, heightMm: 279.4 },
  legal: { label: 'US Legal', widthMm: 215.9, heightMm: 355.6 },
  tabloid: { label: 'Tabloid', widthMm: 279.4, heightMm: 431.8 },
  a4: { label: 'A4', widthMm: 210, heightMm: 297 },
  a3: { label: 'A3', widthMm: 297, heightMm: 420 },
  a2: { label: 'A2', widthMm: 420, heightMm: 594 },
  custom: { label: 'Custom', widthMm: 210, heightMm: 297 },
} as const;

export type PaperPresetId = keyof typeof PAPER_PRESETS;
export type PrintSettings = {
  mode: 'single' | 'contact-sheet';
  paper: PaperPresetId;
  customWidthMm: number;
  customHeightMm: number;
  orientation: 'portrait' | 'landscape';
  marginMm: number;
  bleedMm: number;
  scaleMode: 'fit' | 'fill' | 'actual' | 'custom';
  scalePercent: number;
  sourcePpi: number;
  placement: 'center' | 'top-left' | 'custom';
  offsetXmm: number;
  offsetYmm: number;
  columns: number;
  gapMm: number;
  cropMarks: boolean;
  registrationMarks: boolean;
  colorBars: boolean;
  metadata: boolean;
  metadataText: string;
  printerProfile: 'printer-managed' | 'srgb' | 'display-p3' | 'adobe-rgb';
  renderingIntent: 'perceptual' | 'relative' | 'saturation' | 'absolute';
  blackPointCompensation: boolean;
};

export type PrintSourceSize = {
  name: string;
  width: number;
  height: number;
};

export type PrintRect = { x: number; y: number; width: number; height: number };
export type PrintLayout = {
  page: { width: number; height: number; ppi: number };
  trim: PrintRect;
  bleed: PrintRect;
  items: Array<PrintRect & { sourceIndex: number; captionY?: number }>;
};

export const defaultPrintSettings: PrintSettings = {
  mode: 'single',
  paper: 'letter',
  customWidthMm: 210,
  customHeightMm: 297,
  orientation: 'portrait',
  marginMm: 12.7,
  bleedMm: 3,
  scaleMode: 'fit',
  scalePercent: 100,
  sourcePpi: 300,
  placement: 'center',
  offsetXmm: 0,
  offsetYmm: 0,
  columns: 3,
  gapMm: 4,
  cropMarks: true,
  registrationMarks: false,
  colorBars: false,
  metadata: true,
  metadataText: '',
  printerProfile: 'printer-managed',
  renderingIntent: 'relative',
  blackPointCompensation: true,
};

const finite = (value: unknown, fallback: number, min: number, max: number) =>
  Number.isFinite(value)
    ? Math.max(min, Math.min(max, Number(value)))
    : fallback;

export const normalizePrintSettings = (
  value?: Partial<PrintSettings> | null,
): PrintSettings => {
  const enumValue = <T extends string>(
    candidate: unknown,
    values: readonly T[],
    fallback: T,
  ) => (values.includes(candidate as T) ? (candidate as T) : fallback);
  return {
    mode: enumValue(value?.mode, ['single', 'contact-sheet'], 'single'),
    paper: enumValue(
      value?.paper,
      Object.keys(PAPER_PRESETS) as PaperPresetId[],
      'letter',
    ),
    customWidthMm: finite(value?.customWidthMm, 210, 50, 1200),
    customHeightMm: finite(value?.customHeightMm, 297, 50, 1200),
    orientation: enumValue(
      value?.orientation,
      ['portrait', 'landscape'],
      'portrait',
    ),
    marginMm: finite(value?.marginMm, 12.7, 0, 100),
    bleedMm: finite(value?.bleedMm, 3, 0, 25),
    scaleMode: enumValue(
      value?.scaleMode,
      ['fit', 'fill', 'actual', 'custom'],
      'fit',
    ),
    scalePercent: finite(value?.scalePercent, 100, 10, 800),
    sourcePpi: finite(value?.sourcePpi, 300, 36, 2400),
    placement: enumValue(
      value?.placement,
      ['center', 'top-left', 'custom'],
      'center',
    ),
    offsetXmm: finite(value?.offsetXmm, 0, -1000, 1000),
    offsetYmm: finite(value?.offsetYmm, 0, -1000, 1000),
    columns: Math.round(finite(value?.columns, 3, 1, 8)),
    gapMm: finite(value?.gapMm, 4, 0, 50),
    cropMarks: value?.cropMarks ?? true,
    registrationMarks: value?.registrationMarks ?? false,
    colorBars: value?.colorBars ?? false,
    metadata: value?.metadata ?? true,
    metadataText:
      typeof value?.metadataText === 'string'
        ? value.metadataText.slice(0, 240)
        : '',
    printerProfile: enumValue(
      value?.printerProfile,
      ['printer-managed', 'srgb', 'display-p3', 'adobe-rgb'],
      'printer-managed',
    ),
    renderingIntent: enumValue(
      value?.renderingIntent,
      ['perceptual', 'relative', 'saturation', 'absolute'],
      'relative',
    ),
    blackPointCompensation: value?.blackPointCompensation ?? true,
  };
};

export const paperSizeMm = (settingsValue: Partial<PrintSettings>) => {
  const settings = normalizePrintSettings(settingsValue),
    preset = PAPER_PRESETS[settings.paper],
    width =
      settings.paper === 'custom' ? settings.customWidthMm : preset.widthMm,
    height =
      settings.paper === 'custom' ? settings.customHeightMm : preset.heightMm;
  return settings.orientation === 'landscape'
    ? { widthMm: height, heightMm: width }
    : { widthMm: width, heightMm: height };
};

const contain = (source: PrintSourceSize, bounds: PrintRect, cover = false) => {
  const scale = cover
      ? Math.max(bounds.width / source.width, bounds.height / source.height)
      : Math.min(bounds.width / source.width, bounds.height / source.height),
    width = source.width * scale,
    height = source.height * scale;
  return {
    x: bounds.x + (bounds.width - width) / 2,
    y: bounds.y + (bounds.height - height) / 2,
    width,
    height,
  };
};

export const planPrintLayout = (
  settingsValue: Partial<PrintSettings>,
  sources: PrintSourceSize[],
  ppi = 96,
): PrintLayout => {
  if (
    !sources.length ||
    sources.some((source) => source.width < 1 || source.height < 1)
  )
    throw new Error('Print layout requires at least one valid image.');
  const settings = normalizePrintSettings(settingsValue),
    paper = paperSizeMm(settings),
    mm = ppi / 25.4,
    page = {
      width: Math.max(1, Math.round(paper.widthMm * mm)),
      height: Math.max(1, Math.round(paper.heightMm * mm)),
      ppi,
    },
    margin = Math.min(
      settings.marginMm * mm,
      Math.min(page.width, page.height) * 0.42,
    ),
    trim = {
      x: margin,
      y: margin,
      width: Math.max(1, page.width - margin * 2),
      height: Math.max(1, page.height - margin * 2),
    },
    bleedSize = settings.bleedMm * mm,
    bleed = {
      x: Math.max(0, trim.x - bleedSize),
      y: Math.max(0, trim.y - bleedSize),
      width: Math.min(page.width, trim.width + bleedSize * 2),
      height: Math.min(page.height, trim.height + bleedSize * 2),
    };
  if (settings.mode === 'contact-sheet') {
    const count = sources.length,
      columns = Math.min(settings.columns, count),
      rows = Math.ceil(count / columns),
      gap = settings.gapMm * mm,
      caption = settings.metadata ? Math.max(12, ppi * 0.18) : 0,
      cellWidth = Math.max(1, (trim.width - gap * (columns - 1)) / columns),
      cellHeight = Math.max(1, (trim.height - gap * (rows - 1)) / rows),
      imageHeight = Math.max(1, cellHeight - caption);
    return {
      page,
      trim,
      bleed,
      items: sources.map((source, sourceIndex) => {
        const column = sourceIndex % columns,
          row = Math.floor(sourceIndex / columns),
          bounds = {
            x: trim.x + column * (cellWidth + gap),
            y: trim.y + row * (cellHeight + gap),
            width: cellWidth,
            height: imageHeight,
          };
        return {
          ...contain(source, bounds),
          sourceIndex,
          ...(settings.metadata
            ? { captionY: bounds.y + imageHeight + caption * 0.72 }
            : {}),
        };
      }),
    };
  }
  const source = sources[0];
  let image = contain(
    source,
    settings.scaleMode === 'fill' ? bleed : trim,
    settings.scaleMode === 'fill',
  );
  if (settings.scaleMode === 'actual') {
    image = {
      x: 0,
      y: 0,
      width: (source.width / settings.sourcePpi) * ppi,
      height: (source.height / settings.sourcePpi) * ppi,
    };
  } else if (settings.scaleMode === 'custom') {
    const fit = contain(source, trim),
      scale = settings.scalePercent / 100;
    image = {
      x: 0,
      y: 0,
      width: fit.width * scale,
      height: fit.height * scale,
    };
  }
  if (settings.scaleMode === 'actual' || settings.scaleMode === 'custom') {
    image.x =
      settings.placement === 'top-left'
        ? trim.x
        : trim.x + (trim.width - image.width) / 2;
    image.y =
      settings.placement === 'top-left'
        ? trim.y
        : trim.y + (trim.height - image.height) / 2;
  }
  if (
    settings.placement === 'custom' ||
    settings.offsetXmm ||
    settings.offsetYmm
  ) {
    image.x += settings.offsetXmm * mm;
    image.y += settings.offsetYmm * mm;
  }
  return {
    page,
    trim,
    bleed,
    items: [{ ...image, sourceIndex: 0 }],
  };
};
