import type { Layer } from 'ag-psd';
import type { PsdImport } from '@/lib/psd-transfer';

export type PsdCompatibilityReport = {
  fileName: string;
  dimensions: string;
  sourceDepth: number;
  workingDepth: number;
  colorMode: PsdImport['colorMode'];
  pixelLayers: number;
  groups: number;
  masks: number;
  warnings: string[];
  status: 'preserved' | 'converted' | 'flattened';
};

export function createPsdCompatibilityReport(
  fileName: string,
  data: PsdImport,
): PsdCompatibilityReport {
  let pixelLayers = 0;
  let groups = 0;
  let masks = 0;
  const walk = (layers: Layer[]) =>
    layers.forEach((layer) => {
      if (layer.children?.length) {
        groups++;
        walk(layer.children);
      } else pixelLayers++;
      if (layer.mask) masks++;
    });
  walk(data.children);
  return {
    fileName,
    dimensions: `${data.width} × ${data.height}`,
    sourceDepth: data.bitDepth,
    workingDepth: data.bitDepth === 1 ? 8 : data.bitDepth,
    colorMode: data.colorMode,
    pixelLayers,
    groups,
    masks,
    warnings: [...data.warnings],
    status: data.warnings.length ? 'flattened' : 'preserved',
  };
}
