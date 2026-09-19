import {
  readPsd,
  writePsd,
  initializeCanvas,
  getLayerImageData,
  getLayerMaskImageData,
  getCompositeImageData,
  type Layer,
  type PixelData,
  type Psd,
} from 'ag-psd';
import {
  MAX_DOCUMENT_PIXELS,
  MAX_SIDE,
  MAX_WORKING_PIXELS,
  checkFileSize,
} from './document-limits';
import { pixelTransfers } from './pixel-transfers';
import { precisionToDisplayRgba } from './high-depth';
import { readSupportedPsdHeader } from './psd-header';
import { unsupportedPsdTextReasons } from './psd-text';

initializeCanvas(
  (w, h) => new OffscreenCanvas(w, h) as unknown as HTMLCanvasElement,
  (w, h) => new ImageData(w, h),
);

const supported = new Set([
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color dodge',
  'color burn',
  'hard light',
  'soft light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
]);
const MAX_PIXELS = MAX_DOCUMENT_PIXELS;
function bounds(w: number, h: number) {
  if (
    !Number.isInteger(w) ||
    !Number.isInteger(h) ||
    w < 0 ||
    h < 0 ||
    w > MAX_SIDE ||
    h > MAX_SIDE ||
    w * h > MAX_PIXELS
  )
    throw Error(
      'PSD/PSB dimensions exceed 16,384 pixels per side or 64 megapixels. No resizing was applied.',
    );
}
function decode(buffer: ArrayBuffer) {
  checkFileSize(buffer.byteLength);
  const header = readSupportedPsdHeader(buffer),
    bitDepth = header.bitDepth;
  bounds(header.width, header.height);
  const psd = readPsd(buffer, {
    useRawData: true,
    useRawThumbnail: true,
    skipThumbnail: true,
    skipLinkedFilesData: true,
    totalMemoryLimit: 256 * 1024 * 1024,
  });
  let count = 0,
    expandedPixels = 0;
  const warnings = new Set<string>();
  const inspect = (layer: Layer, depth = 0) => {
    if (++count > 100 || depth > 20)
      throw Error(
        'PSD files may contain at most 100 layers and 20 nested groups.',
      );
    bounds(
      (layer.right ?? 0) - (layer.left ?? 0),
      (layer.bottom ?? 0) - (layer.top ?? 0),
    );
    expandedPixels += psd.width * psd.height * (layer.mask ? 2 : 1);
    if (expandedPixels > MAX_WORKING_PIXELS)
      throw Error(
        'This layered file exceeds 96 million layer/mask pixels. Reduce the number of layers or dimensions in a copy.',
      );
    if (layer.mask)
      bounds(
        (layer.mask.right ?? 0) - (layer.mask.left ?? 0),
        (layer.mask.bottom ?? 0) - (layer.mask.top ?? 0),
      );
    if (
      layer.effects ||
      layer.adjustment ||
      layer.clipping ||
      layer.vectorMask ||
      layer.vectorFill ||
      layer.vectorStroke ||
      layer.placedLayer ||
      (layer.fillOpacity !== undefined && layer.fillOpacity !== 1)
    )
      warnings.add(
        'Smart objects, clipping, effects, vector content or adjustment layers',
      );
    if (layer.text)
      unsupportedPsdTextReasons(layer.text).forEach((reason) =>
        warnings.add(`Unsupported text: ${reason}`),
      );
    if (layer.realMask || layer.knockout || layer.artboard)
      warnings.add('Additional masks, knockout blending or artboards');
    const ranges = layer.blendingRanges;
    if (
      ranges &&
      [
        ranges.compositeGrayBlendSource,
        ranges.compositeGraphBlendDestinationRange,
        ...ranges.ranges.flatMap((r) => [r.sourceRange, r.destRange]),
      ].some((range) => range.some((v, i) => v !== [0, 0, 255, 255][i]))
    )
      warnings.add('Blend If ranges');
    if (
      layer.children &&
      ((layer.opacity ?? 1) !== 1 ||
        layer.mask ||
        (layer.blendMode ?? 'pass through') !== 'pass through')
    )
      warnings.add('Isolated, masked or translucent layer groups');
    if (!layer.children && !supported.has(layer.blendMode ?? 'normal'))
      warnings.add('Unsupported blend modes');
    if (
      layer.mask &&
      (layer.mask.userMaskFeather ||
        (layer.mask.userMaskDensity !== undefined &&
          layer.mask.userMaskDensity !== 1))
    )
      warnings.add('Mask feather or density settings');
    layer.children?.forEach((child) => inspect(child, depth + 1));
  };
  psd.children?.forEach((layer) => inspect(layer));
  const displayData = (data: PixelData | undefined) =>
    data
      ? new ImageData(precisionToDisplayRgba(data), data.width, data.height)
      : undefined;
  if (warnings.size || !psd.children?.length) {
    const imageData = displayData(getCompositeImageData(psd));
    if (!imageData)
      throw Error(
        'This PSD needs a saved composite preview. Resave a copy with Maximize Compatibility enabled.',
      );
    return {
      width: psd.width,
      height: psd.height,
      bitDepth,
      warnings: [...warnings],
      children: [{ name: 'PSD composite', imageData }],
    };
  }
  const convert = (layer: Layer): Layer => ({
    name: layer.name,
    hidden: layer.hidden,
    opacity: layer.opacity,
    blendMode: layer.blendMode,
    left: layer.left,
    top: layer.top,
    opened: layer.opened,
    transparencyProtected: layer.transparencyProtected,
    text: layer.text,
    children: layer.children?.map(convert),
    imageData: layer.children
      ? undefined
      : displayData(getLayerImageData(layer)),
    mask: layer.mask
      ? {
          left: layer.mask.left,
          top: layer.mask.top,
          defaultColor: layer.mask.defaultColor,
          disabled: layer.mask.disabled,
          positionRelativeToLayer: layer.mask.positionRelativeToLayer,
          imageData: displayData(getLayerMaskImageData(layer)),
        }
      : undefined,
  });
  return {
    width: psd.width,
    height: psd.height,
    bitDepth,
    warnings: [],
    children: psd.children.map(convert),
  };
}
self.onmessage = (
  event: MessageEvent<
    | { action: 'read'; buffer: ArrayBuffer }
    | { action: 'write'; psd: Psd; psb?: boolean }
  >,
) => {
  try {
    if (event.data.action === 'read') {
      const result = decode(event.data.buffer);
      self.postMessage(
        { ok: true, result },
        { transfer: pixelTransfers(result) },
      );
    } else {
      const result = writePsd(event.data.psd, {
        generateThumbnail: false,
        noBackground: true,
        trimImageData: false,
        invalidateTextLayers: true,
        psb: event.data.psb,
      });
      self.postMessage({ ok: true, result }, { transfer: [result] });
    }
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : 'PSD processing failed.',
    });
  }
};
