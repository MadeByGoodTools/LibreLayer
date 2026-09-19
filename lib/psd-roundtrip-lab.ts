import type { Layer, PixelData, Psd } from 'ag-psd';

export type PsdPixelThresholds = {
  maxChannelDelta: number;
  meanAbsoluteDelta: number;
  changedPixelRatio: number;
};

export type PsdPixelMetrics = {
  maxChannelDelta: number;
  meanAbsoluteDelta: number;
  changedPixels: number;
  totalPixels: number;
  changedPixelRatio: number;
};

export type PsdLayerSignature = {
  path: string;
  kind: 'group' | 'pixels';
  bounds: [number, number, number, number];
  blendMode: string;
  opacity: number;
  hidden: boolean;
  clipping: boolean;
  mask: null | {
    bounds: [number, number, number, number];
    disabled: boolean;
    defaultColor: number;
  };
};

export const losslessPsdThresholds: PsdPixelThresholds = {
  maxChannelDelta: 0,
  meanAbsoluteDelta: 0,
  changedPixelRatio: 0,
};

function bounds(layer: Layer, fallbackWidth = 0, fallbackHeight = 0) {
  return [
    layer.left ?? 0,
    layer.top ?? 0,
    layer.right ?? fallbackWidth,
    layer.bottom ?? fallbackHeight,
  ] as [number, number, number, number];
}

export function createPsdStructureSignature(psd: Psd): PsdLayerSignature[] {
  const result: PsdLayerSignature[] = [];
  const walk = (layers: Layer[], parent: string) => {
    layers.forEach((layer, index) => {
      const name = layer.name || `Layer ${index + 1}`;
      const path = parent ? `${parent}/${name}` : name;
      result.push({
        path,
        kind: layer.children ? 'group' : 'pixels',
        bounds: layer.children
          ? bounds(layer)
          : bounds(layer, psd.width, psd.height),
        blendMode:
          layer.blendMode ?? (layer.children ? 'pass through' : 'normal'),
        opacity: layer.opacity ?? 1,
        hidden: layer.hidden ?? false,
        clipping: layer.clipping ?? false,
        mask: layer.mask
          ? {
              bounds: bounds(layer.mask),
              disabled: layer.mask.disabled ?? false,
              defaultColor: layer.mask.defaultColor ?? 0,
            }
          : null,
      });
      if (layer.children) walk(layer.children, path);
    });
  };
  walk(psd.children ?? [], '');
  return result;
}

export function comparePsdPixels(
  expected: PixelData,
  actual: PixelData,
): PsdPixelMetrics {
  if (
    expected.width !== actual.width ||
    expected.height !== actual.height ||
    expected.data.length !== actual.data.length
  ) {
    throw new Error('PSD pixel buffers have different dimensions');
  }
  let totalDelta = 0;
  let maxChannelDelta = 0;
  let changedPixels = 0;
  for (let pixel = 0; pixel < expected.width * expected.height; pixel++) {
    let changed = false;
    for (let channel = 0; channel < 4; channel++) {
      const offset = pixel * 4 + channel;
      const delta = Math.abs(
        Number(expected.data[offset]) - Number(actual.data[offset]),
      );
      totalDelta += delta;
      maxChannelDelta = Math.max(maxChannelDelta, delta);
      changed ||= delta > 0;
    }
    if (changed) changedPixels++;
  }
  const totalPixels = expected.width * expected.height;
  return {
    maxChannelDelta,
    meanAbsoluteDelta: totalDelta / expected.data.length,
    changedPixels,
    totalPixels,
    changedPixelRatio: totalPixels ? changedPixels / totalPixels : 0,
  };
}

export function pixelMetricsPass(
  metrics: PsdPixelMetrics,
  thresholds: PsdPixelThresholds,
) {
  return (
    metrics.maxChannelDelta <= thresholds.maxChannelDelta &&
    metrics.meanAbsoluteDelta <= thresholds.meanAbsoluteDelta &&
    metrics.changedPixelRatio <= thresholds.changedPixelRatio
  );
}

export function collectPsdPixelData(psd: Psd) {
  const result = new Map<string, PixelData>();
  const walk = (layers: Layer[], parent: string) => {
    layers.forEach((layer, index) => {
      const name = layer.name || `Layer ${index + 1}`;
      const path = parent ? `${parent}/${name}` : name;
      if (layer.imageData) result.set(path, layer.imageData);
      if (layer.mask?.imageData)
        result.set(`${path}#mask`, layer.mask.imageData);
      if (layer.children) walk(layer.children, path);
    });
  };
  if (psd.imageData) result.set('#composite', psd.imageData);
  walk(psd.children ?? [], '');
  return result;
}
