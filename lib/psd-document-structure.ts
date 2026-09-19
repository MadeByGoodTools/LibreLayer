import type { ImageResources, Layer } from 'ag-psd';
import type { EditorView, Guide } from './editor-view.ts';
import { psdIccFromBase64 } from './psd-icc.ts';

type PsdLayerComps = NonNullable<ImageResources['layerComps']>;
type PsdLayerCompSettings = NonNullable<Layer['comps']>;

export type PortablePsdDocumentMetadata = Pick<
  ImageResources,
  | 'xmpMetadata'
  | 'pixelAspectRatio'
  | 'globalAngle'
  | 'globalAltitude'
  | 'printScale'
  | 'iccUntaggedProfile'
> & { iccProfile?: string };

export type PortableCompState = {
  id: string;
  visible: boolean;
  x: number;
  y: number;
  opacity: number;
  fill?: number;
  blend: string;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
};

export type PortableLayerComp = {
  id: string;
  name: string;
  comment?: string;
  states: PortableCompState[];
};

export type PortableCompLayer = PortableCompState;

export type ImportedPsdCompLayer = {
  sourceId?: number;
  layerId: string;
  visible: boolean;
  comps?: PsdLayerCompSettings;
};

const same = (
  left: number | undefined,
  right: number | undefined,
  fallback: number,
) => (left ?? fallback) === (right ?? fallback);

const sameAppearance = (state: PortableCompState, layer: PortableCompLayer) =>
  state.opacity === layer.opacity &&
  same(state.fill, layer.fill, 100) &&
  state.blend === layer.blend &&
  same(state.rotation, layer.rotation, 0) &&
  same(state.scaleX, layer.scaleX, 1) &&
  same(state.scaleY, layer.scaleY, 1) &&
  same(state.brightness, layer.brightness, 100) &&
  same(state.contrast, layer.contrast, 100) &&
  same(state.saturation, layer.saturation, 100) &&
  same(state.blur, layer.blur, 0);

export function canExportPsdLayerComps(
  comps: PortableLayerComp[],
  layers: PortableCompLayer[],
) {
  if (comps.length > 256 || layers.length > 100) return false;
  const layerById = new Map(layers.map((layer) => [layer.id, layer]));
  return comps.every((comp) => {
    const stateIds = new Set<string>();
    return (
      comp.name.length > 0 &&
      comp.name.length <= 255 &&
      comp.states.length === layers.length &&
      comp.states.every((state) => {
        if (stateIds.has(state.id)) return false;
        stateIds.add(state.id);
        const layer = layerById.get(state.id);
        return (
          Boolean(layer) &&
          Number.isFinite(state.x) &&
          Number.isFinite(state.y) &&
          sameAppearance(state, layer!)
        );
      }) &&
      stateIds.size === layerById.size
    );
  });
}

export function planPsdLayerComps(
  comps: PortableLayerComp[],
  layers: PortableCompLayer[],
): {
  resource?: PsdLayerComps;
  byLayerId: Record<string, PsdLayerCompSettings>;
} {
  if (!comps.length) return { byLayerId: {} };
  if (!canExportPsdLayerComps(comps, layers))
    throw Error(
      'PSD layer comps currently preserve visibility and position only. Update or remove comps with opacity, fill, blend, transform, adjustment, or blur changes before layered export.',
    );
  const compIds = new Map(comps.map((comp, index) => [comp.id, index + 1])),
    byLayerId: Record<string, PsdLayerCompSettings> = {};
  for (const layer of layers) {
    const settings: PsdLayerCompSettings['settings'] = [];
    for (const comp of comps) {
      const state = comp.states.find((candidate) => candidate.id === layer.id)!;
      settings.push({
        enabled: state.visible,
        offset: { x: state.x - layer.x, y: state.y - layer.y },
        compList: [compIds.get(comp.id)!],
      });
    }
    byLayerId[layer.id] = { settings };
  }
  return {
    resource: {
      list: comps.map((comp) => ({
        id: compIds.get(comp.id)!,
        name: comp.name,
        ...(comp.comment ? { comment: comp.comment } : {}),
        capturedInfo: 3 as PsdLayerComps['list'][number]['capturedInfo'],
      })),
    },
    byLayerId,
  };
}

export function supportedPsdLayerComps(
  resource: ImageResources['layerComps'],
  layers: Layer[],
) {
  if (!resource) return true;
  if (resource.list.length > 256) return false;
  const ids = new Set<number>();
  for (const comp of resource.list) {
    if (
      !Number.isInteger(comp.id) ||
      comp.id <= 0 ||
      ids.has(comp.id) ||
      !comp.name ||
      comp.name.length > 255 ||
      (comp.capturedInfo & ~3) !== 0
    )
      return false;
    ids.add(comp.id);
  }
  const inspect = (nodes: Layer[]): boolean =>
    nodes.every((layer) => {
      const settings = layer.comps;
      if (
        settings?.originalEffectsReferencePoint ||
        settings?.settings.some(
          (setting) =>
            setting.effectsReferencePoint ||
            !setting.compList.length ||
            setting.compList.some((id) => !ids.has(id)) ||
            (setting.offset &&
              (!Number.isFinite(setting.offset.x) ||
                !Number.isFinite(setting.offset.y))),
        )
      )
        return false;
      return !layer.children || inspect(layer.children);
    });
  return inspect(layers);
}

const resolutionInPpi = (value: number, unit: 'PPI' | 'PPCM') =>
  value * (unit === 'PPCM' ? 2.54 : 1);

export function supportedPsdDocumentView(
  resources: ImageResources | undefined,
) {
  const info = resources?.gridAndGuidesInformation,
    grid = info?.grid,
    guides = info?.guides ?? [],
    resolution = resources?.resolutionInfo;
  if (
    guides.length > 100 ||
    guides.some(
      (guide) =>
        !Number.isFinite(guide.location) ||
        Math.abs(guide.location) > 16384 ||
        !['horizontal', 'vertical'].includes(guide.direction),
    )
  )
    return false;
  if (
    grid &&
    (!Number.isFinite(grid.horizontal) ||
      !Number.isFinite(grid.vertical) ||
      grid.horizontal < 32 ||
      grid.vertical < 32 ||
      grid.horizontal > 320000 ||
      grid.vertical > 320000 ||
      Math.round(grid.horizontal) !== grid.horizontal ||
      Math.round(grid.vertical) !== grid.vertical ||
      grid.horizontal !== grid.vertical)
  )
    return false;
  if (resolution) {
    const horizontal = resolutionInPpi(
        resolution.horizontalResolution,
        resolution.horizontalResolutionUnit,
      ),
      vertical = resolutionInPpi(
        resolution.verticalResolution,
        resolution.verticalResolutionUnit,
      );
    if (
      !Number.isFinite(horizontal) ||
      !Number.isFinite(vertical) ||
      horizontal < 1 ||
      horizontal > 2400 ||
      vertical < 1 ||
      vertical > 2400 ||
      Math.abs(horizontal - vertical) > 0.01
    )
      return false;
  }
  return true;
}

export function supportedPsdDocumentMetadata(
  metadata: PortablePsdDocumentMetadata | undefined,
) {
  if (!metadata) return true;
  const scale = metadata.printScale;
  let validIcc = true;
  try {
    psdIccFromBase64(metadata.iccProfile);
  } catch {
    validIcc = false;
  }
  return (
    (metadata.xmpMetadata === undefined ||
      (typeof metadata.xmpMetadata === 'string' &&
        metadata.xmpMetadata.length <= 1_000_000)) &&
    (metadata.pixelAspectRatio === undefined ||
      (Number.isFinite(metadata.pixelAspectRatio.aspect) &&
        metadata.pixelAspectRatio.aspect > 0 &&
        metadata.pixelAspectRatio.aspect <= 100)) &&
    (metadata.globalAngle === undefined ||
      (Number.isFinite(metadata.globalAngle) &&
        metadata.globalAngle >= -360 &&
        metadata.globalAngle <= 360)) &&
    (metadata.globalAltitude === undefined ||
      (Number.isFinite(metadata.globalAltitude) &&
        metadata.globalAltitude >= -90 &&
        metadata.globalAltitude <= 90)) &&
    (metadata.iccUntaggedProfile === undefined ||
      typeof metadata.iccUntaggedProfile === 'boolean') &&
    validIcc &&
    (scale === undefined ||
      ((!scale.style ||
        ['centered', 'size to fit', 'user defined'].includes(scale.style)) &&
        [scale.x, scale.y].every(
          (value) =>
            value === undefined ||
            (Number.isFinite(value) && Math.abs(value) <= 100_000),
        ) &&
        (scale.scale === undefined ||
          (Number.isFinite(scale.scale) &&
            scale.scale > 0 &&
            scale.scale <= 100_000))))
  );
}

export function psdDocumentMetadata(
  resources: ImageResources | undefined,
): PortablePsdDocumentMetadata {
  const metadata: PortablePsdDocumentMetadata = {
    xmpMetadata: resources?.xmpMetadata,
    pixelAspectRatio: resources?.pixelAspectRatio
      ? { ...resources.pixelAspectRatio }
      : undefined,
    globalAngle: resources?.globalAngle,
    globalAltitude: resources?.globalAltitude,
    printScale: resources?.printScale ? { ...resources.printScale } : undefined,
    iccUntaggedProfile: resources?.iccUntaggedProfile,
  };
  const iccProfile = (resources as PortablePsdDocumentMetadata | undefined)
    ?.iccProfile;
  if (iccProfile !== undefined) metadata.iccProfile = iccProfile;
  if (!supportedPsdDocumentMetadata(metadata))
    throw Error('Unsupported or malformed PSD document metadata');
  return metadata;
}

export function importPsdLayerComps(
  resource: ImageResources['layerComps'],
  layers: ImportedPsdCompLayer[],
): Array<{
  sourceId: number;
  name: string;
  comment?: string;
  states: { id: string; visible: boolean; x: number; y: number }[];
}> {
  if (!resource || !supportedPsdLayerComps(resource, [])) return [];
  return resource.list.map((comp) => ({
    sourceId: comp.id,
    name: comp.name,
    ...(comp.comment ? { comment: comp.comment } : {}),
    states: layers.map((layer) => {
      const setting = layer.comps?.settings.find((candidate) =>
        candidate.compList.includes(comp.id),
      );
      return {
        id: layer.layerId,
        visible: setting?.enabled ?? layer.visible,
        x: setting?.offset?.x ?? 0,
        y: setting?.offset?.y ?? 0,
      };
    }),
  }));
}

export function editorViewToPsdResources(
  view: EditorView,
): Pick<ImageResources, 'gridAndGuidesInformation' | 'resolutionInfo'> {
  return {
    gridAndGuidesInformation: {
      grid: {
        horizontal: Math.round(view.gridSize * 32),
        vertical: Math.round(view.gridSize * 32),
      },
      guides: view.guides.map((guide) => ({
        location: guide.position,
        direction: guide.axis === 'y' ? 'horizontal' : 'vertical',
      })),
    },
    resolutionInfo: {
      horizontalResolution: view.resolution,
      horizontalResolutionUnit: 'PPI',
      widthUnit: 'Inches',
      verticalResolution: view.resolution,
      verticalResolutionUnit: 'PPI',
      heightUnit: 'Inches',
    },
  };
}

export function psdResourcesToEditorView(
  resources: ImageResources | undefined,
): Pick<EditorView, 'gridSize' | 'resolution' | 'guides'> {
  const info = resources?.gridAndGuidesInformation,
    resolution = resources?.resolutionInfo,
    guides: Guide[] = (info?.guides ?? [])
      .filter(
        (guide) =>
          Number.isFinite(guide.location) && Math.abs(guide.location) <= 16384,
      )
      .slice(0, 100)
      .map((guide, index) => ({
        id: `psd-guide-${index}-${guide.direction}-${guide.location}`,
        axis: guide.direction === 'horizontal' ? 'y' : 'x',
        position: guide.location,
      }));
  return {
    gridSize: Math.max(
      1,
      Math.min(10000, Math.round((info?.grid?.horizontal ?? 3200) / 32)),
    ),
    resolution: Math.max(
      1,
      Math.min(
        2400,
        Math.round(
          resolution
            ? resolutionInPpi(
                resolution.horizontalResolution,
                resolution.horizontalResolutionUnit,
              )
            : 72,
        ),
      ),
    ),
    guides,
  };
}
