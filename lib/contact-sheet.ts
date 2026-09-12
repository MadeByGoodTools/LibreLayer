export type ContactSheetItem = {
  width: number;
  height: number;
  label: string;
};

export type ContactSheetCell = {
  x: number;
  y: number;
  width: number;
  height: number;
  imageX: number;
  imageY: number;
  imageWidth: number;
  imageHeight: number;
  label: string;
};

export function planContactSheet(
  items: readonly ContactSheetItem[],
  options: {
    columns: number;
    cellWidth?: number;
    cellHeight?: number;
    gap?: number;
  },
) {
  if (!items.length || items.length > 100)
    throw Error('Contact sheets require 1 to 100 images.');
  if (items.some((item) => item.width < 1 || item.height < 1))
    throw Error('Contact sheet image dimensions are invalid.');
  const columns = Math.max(
      1,
      Math.min(items.length, Math.round(options.columns)),
    ),
    cellWidth = Math.max(
      120,
      Math.min(640, Math.round(options.cellWidth ?? 280)),
    ),
    cellHeight = Math.max(
      100,
      Math.min(520, Math.round(options.cellHeight ?? 220)),
    ),
    gap = Math.max(8, Math.min(80, Math.round(options.gap ?? 20))),
    caption = 28,
    rows = Math.ceil(items.length / columns),
    width = gap + columns * (cellWidth + gap),
    height = gap + rows * (cellHeight + caption + gap),
    cells = items.map((item, index): ContactSheetCell => {
      const column = index % columns,
        row = Math.floor(index / columns),
        x = gap + column * (cellWidth + gap),
        y = gap + row * (cellHeight + caption + gap),
        scale = Math.min(cellWidth / item.width, cellHeight / item.height),
        imageWidth = Math.max(1, Math.round(item.width * scale)),
        imageHeight = Math.max(1, Math.round(item.height * scale));
      return {
        x,
        y,
        width: cellWidth,
        height: cellHeight,
        imageX: x + Math.round((cellWidth - imageWidth) / 2),
        imageY: y + Math.round((cellHeight - imageHeight) / 2),
        imageWidth,
        imageHeight,
        label: item.label.slice(0, 120),
      };
    });
  return { width, height, columns, rows, gap, caption, cells };
}
