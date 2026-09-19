import {
  deserializeWorkingSurface,
  normalizeWorkingDepth,
  type StoredWorkingSurface,
  type WorkingDepth,
} from './working-depth.ts';
import {
  normalizeColorProfile,
  registerIccProfile,
  type ColorProfileId,
  type PortableIccProfile,
} from './color-management.ts';

export type EmbeddedSurfaceRecord = {
  id: string;
  pixels: string;
  mask?: string;
  workingPixels?: StoredWorkingSurface;
};

export type EmbeddedLayerRecord = {
  id: string;
  name: string;
  parentId?: string;
  kind?: string;
  smartObject?: { embeddedDocument?: unknown };
};

export type EmbeddedDocumentEnvelope = {
  version: 1;
  width: number;
  height: number;
  workingDepth?: WorkingDepth;
  sceneReferred?: boolean;
  colorProfile?: ColorProfileId;
  colorProfileData?: PortableIccProfile;
  layers: EmbeddedLayerRecord[];
  surfaces: EmbeddedSurfaceRecord[];
  selectedId: string;
  selectedIds?: string[];
  paths?: unknown[];
  layerComps?: unknown[];
  artboards?: unknown[];
};

const PNG_PREFIX = 'data:image/png;base64,';

export const validateEmbeddedDocument = (
  value: unknown,
  depth = 0,
  seen = new Set<unknown>(),
): EmbeddedDocumentEnvelope => {
  if (!value || typeof value !== 'object' || seen.has(value) || depth > 20)
    throw Error('Invalid embedded Smart Object document');
  seen.add(value);
  const data = value as Partial<EmbeddedDocumentEnvelope>;
  const workingDepth = normalizeWorkingDepth(data.workingDepth);
  if (data.colorProfileData !== undefined) {
    const profile = registerIccProfile(data.colorProfileData);
    if (profile.id !== data.colorProfile)
      throw Error('Invalid embedded Smart Object color profile');
  }
  if (
    data.version !== 1 ||
    !Number.isInteger(data.width) ||
    !Number.isInteger(data.height) ||
    (data.width ?? 0) < 1 ||
    (data.height ?? 0) < 1 ||
    (data.width ?? 0) * (data.height ?? 0) > 64_000_000 ||
    !Array.isArray(data.layers) ||
    data.layers.length < 1 ||
    data.layers.length > 100 ||
    !Array.isArray(data.surfaces) ||
    data.surfaces.length !== data.layers.length ||
    typeof data.selectedId !== 'string'
  )
    throw Error('Invalid embedded Smart Object document');
  if (
    data.sceneReferred !== undefined &&
    typeof data.sceneReferred !== 'boolean'
  )
    throw Error('Invalid embedded Smart Object color encoding');
  if (data.sceneReferred === true && workingDepth === '8u')
    throw Error('Scene-referred embedded content requires high-depth pixels');
  if (
    data.colorProfile !== undefined &&
    normalizeColorProfile(data.colorProfile) !== data.colorProfile
  )
    throw Error('Invalid embedded Smart Object color profile');

  const ids = new Set<string>();
  for (const layer of data.layers) {
    if (
      !layer ||
      typeof layer.id !== 'string' ||
      !layer.id ||
      ids.has(layer.id) ||
      typeof layer.name !== 'string'
    )
      throw Error('Invalid embedded Smart Object layer');
    ids.add(layer.id);
  }
  if (!ids.has(data.selectedId))
    throw Error('Invalid embedded Smart Object selection');
  if (
    data.selectedIds !== undefined &&
    (!Array.isArray(data.selectedIds) ||
      data.selectedIds.some((id) => typeof id !== 'string' || !ids.has(id)))
  )
    throw Error('Invalid embedded Smart Object selection');
  if (
    data.artboards !== undefined &&
    (!Array.isArray(data.artboards) || data.artboards.length > 256)
  )
    throw Error('Invalid embedded Smart Object artboards');

  const surfaceIds = new Set<string>();
  for (const surface of data.surfaces) {
    if (
      !surface ||
      typeof surface.id !== 'string' ||
      surfaceIds.has(surface.id) ||
      !ids.has(surface.id) ||
      typeof surface.pixels !== 'string' ||
      !surface.pixels.startsWith(PNG_PREFIX) ||
      (surface.mask !== undefined &&
        (typeof surface.mask !== 'string' ||
          !surface.mask.startsWith(PNG_PREFIX)))
    )
      throw Error('Invalid embedded Smart Object pixels');
    if (workingDepth === '8u' && surface.workingPixels !== undefined)
      throw Error('Unexpected high-depth embedded pixels');
    if (workingDepth !== '8u') {
      const precision = deserializeWorkingSurface(
        surface.workingPixels as StoredWorkingSurface,
      );
      if (
        precision.depth !== workingDepth ||
        precision.width !== data.width ||
        precision.height !== data.height
      )
        throw Error('Invalid embedded high-depth pixels');
    }
    surfaceIds.add(surface.id);
  }
  if (surfaceIds.size !== ids.size)
    throw Error('Missing embedded Smart Object pixels');

  for (const layer of data.layers) {
    if (layer.parentId && !ids.has(layer.parentId))
      throw Error('Invalid embedded Smart Object group');
    const nested = layer.smartObject?.embeddedDocument;
    if (nested) validateEmbeddedDocument(nested, depth + 1, seen);
  }
  seen.delete(value);
  return data as EmbeddedDocumentEnvelope;
};
