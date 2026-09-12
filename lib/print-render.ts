import {
  normalizePrintSettings,
  planPrintLayout,
  type PrintSettings,
} from './print-layout';

export type PrintCanvasSource = {
  name: string;
  canvas: HTMLCanvasElement;
};

const line = (
  context: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) => {
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
};

export const renderPrintSheet = (
  sources: PrintCanvasSource[],
  settingsValue: Partial<PrintSettings>,
  ppi = 96,
) => {
  const settings = normalizePrintSettings(settingsValue),
    layout = planPrintLayout(
      settings,
      sources.map((source) => ({
        name: source.name,
        width: source.canvas.width,
        height: source.canvas.height,
      })),
      ppi,
    ),
    canvas = document.createElement('canvas');
  canvas.width = layout.page.width;
  canvas.height = layout.page.height;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.save();
  context.beginPath();
  context.rect(0, 0, canvas.width, canvas.height);
  context.clip();
  for (const item of layout.items) {
    const source = sources[item.sourceIndex];
    context.drawImage(source.canvas, item.x, item.y, item.width, item.height);
    if (item.captionY !== undefined) {
      context.fillStyle = '#111111';
      context.font = `${Math.max(9, Math.round(ppi * 0.1))}px system-ui, sans-serif`;
      context.textAlign = 'center';
      context.fillText(
        source.name,
        item.x + item.width / 2,
        item.captionY,
        item.width,
      );
    }
  }
  context.restore();
  const mark = Math.max(8, ppi * 0.12),
    offset = Math.max(3, ppi * 0.045),
    trim = layout.trim;
  context.strokeStyle = '#111111';
  context.lineWidth = Math.max(1, ppi / 144);
  if (settings.cropMarks) {
    for (const [x, direction] of [
      [trim.x, -1],
      [trim.x + trim.width, 1],
    ] as const) {
      line(context, x, trim.y - offset, x, trim.y - offset - mark);
      line(
        context,
        x,
        trim.y + trim.height + offset,
        x,
        trim.y + trim.height + offset + mark,
      );
      line(
        context,
        x + direction * offset,
        trim.y,
        x + direction * (offset + mark),
        trim.y,
      );
      line(
        context,
        x + direction * offset,
        trim.y + trim.height,
        x + direction * (offset + mark),
        trim.y + trim.height,
      );
    }
  }
  if (settings.registrationMarks) {
    const radius = Math.max(5, ppi * 0.055),
      centers = [
        [canvas.width / 2, Math.max(radius + 2, trim.y / 2)],
        [canvas.width / 2, canvas.height - Math.max(radius + 2, trim.y / 2)],
        [Math.max(radius + 2, trim.x / 2), canvas.height / 2],
        [canvas.width - Math.max(radius + 2, trim.x / 2), canvas.height / 2],
      ];
    for (const [x, y] of centers) {
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.stroke();
      line(context, x - radius * 1.5, y, x + radius * 1.5, y);
      line(context, x, y - radius * 1.5, x, y + radius * 1.5);
    }
  }
  if (settings.colorBars) {
    const colors = [
        '#00ffff',
        '#ff00ff',
        '#ffff00',
        '#000000',
        '#ff0000',
        '#00ff00',
        '#0000ff',
      ],
      width = Math.min(trim.width, colors.length * ppi * 0.28),
      swatch = width / colors.length,
      y = Math.max(2, trim.y - ppi * 0.23);
    colors.forEach((color, index) => {
      context.fillStyle = color;
      context.fillRect(trim.x + index * swatch, y, swatch, ppi * 0.14);
    });
  }
  if (settings.metadata) {
    context.fillStyle = '#111111';
    context.font = `${Math.max(8, Math.round(ppi * 0.085))}px system-ui, sans-serif`;
    context.textAlign = 'left';
    const profile =
        settings.printerProfile === 'printer-managed'
          ? 'Printer manages color'
          : settings.printerProfile,
      text = [sources[0].name, settings.metadataText, profile]
        .filter(Boolean)
        .join(' · ');
    context.fillText(
      text,
      trim.x,
      canvas.height - Math.max(3, trim.y * 0.32),
      trim.width,
    );
  }
  return { canvas, layout };
};
