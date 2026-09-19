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
import { supportedPsdAdjustment } from './psd-adjustment';
import { supportedPsdEffects } from './psd-effects';
import { supportedPsdSmartObject } from './psd-smart-object';
import { supportedPsdBlendIf, supportedPsdKnockout } from './psd-compositing';
import {
  supportedPsdDocumentView,
  supportedPsdDocumentMetadata,
  supportedPsdLayerComps,
} from './psd-document-structure';
import { supportedPsdShapeLayer } from './psd-shape';
import type { PsdLayerImport } from './psd-transfer';
import { extractPsdIccProfile, injectPsdIccProfile } from './psd-icc';
import {
  extractPsdPaths,
  injectPsdPaths,
  type PortablePsdPath,
} from './psd-paths';
import { extractPsdResources, mergeMissingPsdResources } from './psd-resources';
import {
  extractPsdCompAppearance,
  injectPsdCompAppearance,
} from './psd-comp-appearance';
import {
  psdHasMergedTransparency,
  restoreLazyCompositeAlpha,
} from './psd-composite-alpha';
import type { PortableLayerComp } from './psd-document-structure';

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
    bitDepth = header.bitDepth,
    iccProfile = extractPsdIccProfile(buffer),
    paths = extractPsdPaths(buffer, header.width, header.height);
  const preservedResources = extractPsdResources(buffer);
  const compAppearance = extractPsdCompAppearance(buffer);
  bounds(header.width, header.height);
  const psd = readPsd(buffer, {
    useRawData: true,
    useRawThumbnail: true,
    skipThumbnail: true,
    skipLinkedFilesData: false,
    totalMemoryLimit: 256 * 1024 * 1024,
  });
  const compositePixels = getCompositeImageData(psd);
  psd.additionalChannelData = restoreLazyCompositeAlpha(
    compositePixels,
    psd.additionalChannelData,
    psdHasMergedTransparency(buffer, header.version === 2),
  );
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
      (layer.vectorMask || layer.vectorStroke) &&
      !supportedPsdShapeLayer(layer)
    )
      warnings.add('Unsupported vector content');
    if (
      layer.fillOpacity !== undefined &&
      (!Number.isFinite(layer.fillOpacity) ||
        layer.fillOpacity < 0 ||
        layer.fillOpacity > 1)
    )
      warnings.add('Invalid layer fill opacity');
    if (layer.effects && !supportedPsdEffects(layer.effects))
      warnings.add('Unsupported or non-lossless layer effects');
    if (
      layer.placedLayer &&
      !supportedPsdSmartObject(layer.placedLayer, psd.linkedFiles)
    )
      warnings.add('Unsupported or non-lossless Smart Object or Smart Filter');
    if (layer.adjustment && !supportedPsdAdjustment(layer.adjustment))
      warnings.add(`Unsupported adjustment layer: ${layer.adjustment.type}`);
    if (layer.text)
      unsupportedPsdTextReasons(layer.text).forEach((reason) =>
        warnings.add(`Unsupported text: ${reason}`),
      );
    if (
      layer.vectorFill &&
      layer.vectorFill.type !== 'color' &&
      layer.vectorFill.type !== 'solid'
    )
      warnings.add('Unsupported noise-gradient or pattern fill layer');
    if (layer.realMask || layer.artboard)
      warnings.add('Additional masks or artboards');
    if (!supportedPsdKnockout(layer.knockout))
      warnings.add('Invalid knockout blending');
    if (!supportedPsdBlendIf(layer.blendingRanges))
      warnings.add('Invalid Blend If ranges');
    if (
      layer.children &&
      !['pass through', 'normal'].includes(layer.blendMode ?? 'pass through')
    )
      warnings.add('Unsupported layer-group blend mode');
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
  if (
    !supportedPsdLayerComps(
      psd.imageResources?.layerComps,
      psd.children ?? [],
    ) ||
    (psd.imageResources?.layerComps?.list.some(
      (comp) => (comp.capturedInfo & 4) !== 0,
    ) &&
      !compAppearance)
  )
    warnings.add('Unsupported appearance-based or malformed layer comps');
  if (!supportedPsdDocumentView(psd.imageResources))
    warnings.add('Unsupported or excessive PSD guides, grid, or resolution');
  if (!supportedPsdDocumentMetadata(psd.imageResources))
    warnings.add('Unsupported or malformed PSD document metadata');
  const displayData = (data: PixelData | undefined) =>
    data
      ? new ImageData(precisionToDisplayRgba(data), data.width, data.height)
      : undefined;
  const channels = psd.additionalChannelData?.map((plane, index) => {
    const maximum = plane.data instanceof Uint16Array ? 65535 : 1;
    const rgba = new Uint8ClampedArray(plane.width * plane.height * 4);
    for (let pixel = 0; pixel < plane.width * plane.height; pixel++) {
      const raw = plane.data[pixel],
        value =
          plane.data instanceof Uint8Array
            ? raw
            : plane.data instanceof Uint16Array
              ? Math.round((raw / maximum) * 255)
              : Math.round(Math.max(0, Math.min(1, raw)) * 255),
        offset = pixel * 4;
      rgba[offset] = rgba[offset + 1] = rgba[offset + 2] = value;
      rgba[offset + 3] = 255;
    }
    return {
      name:
        psd.imageResources?.alphaChannelNames?.[index] || `Alpha ${index + 1}`,
      id: psd.imageResources?.alphaIdentifiers?.[index],
      imageData: new ImageData(rgba, plane.width, plane.height),
    };
  });
  if (warnings.size || !psd.children?.length) {
    const imageData = displayData(compositePixels);
    if (!imageData)
      throw Error(
        'This PSD needs a saved composite preview. Resave a copy with Maximize Compatibility enabled.',
      );
    return {
      width: psd.width,
      height: psd.height,
      bitDepth,
      colorMode: header.colorMode,
      iccProfile,
      paths,
      channels,
      preservedResources,
      compAppearance,
      warnings: [...warnings],
      children: [
        {
          name: 'PSD composite',
          imageData,
          precisionData:
            bitDepth === 16 || bitDepth === 32 ? compositePixels : undefined,
        },
      ],
    };
  }
  const convert = (layer: Layer): PsdLayerImport => {
    const layerPixels = layer.children ? undefined : getLayerImageData(layer);
    return {
      name: layer.name,
      hidden: layer.hidden,
      opacity: layer.opacity,
      fillOpacity: layer.fillOpacity,
      blendMode: layer.blendMode,
      clipping: layer.clipping,
      blendingRanges: layer.blendingRanges,
      left: layer.left,
      top: layer.top,
      opened: layer.opened,
      id: layer.id,
      comps: layer.comps,
      transparencyProtected: layer.transparencyProtected,
      knockout: layer.knockout,
      text: layer.text,
      vectorFill: layer.vectorFill,
      vectorMask: layer.vectorMask,
      vectorStroke: layer.vectorStroke,
      vectorOrigination: layer.vectorOrigination,
      adjustment: layer.adjustment,
      effects: layer.effects,
      placedLayer: layer.placedLayer,
      children: layer.children?.map(convert),
      imageData: displayData(layerPixels),
      precisionData:
        bitDepth === 16 || bitDepth === 32 ? layerPixels : undefined,
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
    };
  };
  return {
    width: psd.width,
    height: psd.height,
    bitDepth,
    colorMode: header.colorMode,
    iccProfile,
    paths,
    channels,
    preservedResources,
    compAppearance,
    warnings: [],
    children: psd.children.map(convert),
    linkedFiles: psd.linkedFiles,
    imageResources: psd.imageResources
      ? {
          gridAndGuidesInformation: psd.imageResources.gridAndGuidesInformation,
          resolutionInfo: psd.imageResources.resolutionInfo,
          layerComps: psd.imageResources.layerComps,
          xmpMetadata: psd.imageResources.xmpMetadata,
          pixelAspectRatio: psd.imageResources.pixelAspectRatio,
          globalAngle: psd.imageResources.globalAngle,
          globalAltitude: psd.imageResources.globalAltitude,
          printScale: psd.imageResources.printScale,
          iccUntaggedProfile: psd.imageResources.iccUntaggedProfile,
          alphaChannelNames: psd.imageResources.alphaChannelNames,
          alphaIdentifiers: psd.imageResources.alphaIdentifiers,
        }
      : undefined,
  };
}
self.onmessage = (
  event: MessageEvent<
    | { action: 'read'; buffer: ArrayBuffer }
    | {
        action: 'write';
        psd: Psd;
        psb?: boolean;
        iccProfile?: Uint8Array;
        paths?: PortablePsdPath[];
        channels?: { name: string; id?: number; imageData: ImageData }[];
        preservedResources?: Uint8Array[];
        compAppearance?: PortableLayerComp[];
      }
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
      const result = injectPsdCompAppearance(
        mergeMissingPsdResources(
          injectPsdIccProfile(
            injectPsdPaths(
              writePsd(
                {
                  ...event.data.psd,
                  additionalChannelData: event.data.channels?.map(
                    (channel) => ({
                      width: channel.imageData.width,
                      height: channel.imageData.height,
                      data: new Uint8Array(
                        channel.imageData.data.filter(
                          (_, index) => index % 4 === 0,
                        ),
                      ),
                    }),
                  ),
                  imageResources: {
                    ...event.data.psd.imageResources,
                    alphaChannelNames: event.data.channels?.map(
                      (channel) => channel.name,
                    ),
                    alphaIdentifiers: event.data.channels?.map(
                      (channel, index) => channel.id ?? index + 1,
                    ),
                  },
                },
                {
                  generateThumbnail: false,
                  noBackground: true,
                  trimImageData: false,
                  invalidateTextLayers: true,
                  psb: event.data.psb,
                },
              ),
              event.data.paths,
              event.data.psd.width,
              event.data.psd.height,
            ),
            event.data.iccProfile,
          ),
          event.data.preservedResources,
        ),
        event.data.compAppearance,
      );
      self.postMessage({ ok: true, result }, { transfer: [result] });
    }
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : 'PSD processing failed.',
    });
  }
};
