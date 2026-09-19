import type {
  PortableCompState,
  PortableLayerComp,
} from './psd-document-structure.ts';
import {
  extractPsdResourcePayload,
  upsertPsdResource,
} from './psd-resources.ts';

const RESOURCE_ID = 0xbef0;
const marker = 'LibreLayerCompAppearance/1\n';

const finiteOptional = (value: unknown) =>
  value === undefined || (typeof value === 'number' && Number.isFinite(value));

const validComps = (value: unknown): value is PortableLayerComp[] => {
  if (!Array.isArray(value) || value.length > 256) return false;
  const compIds = new Set<string>();
  return value.every((comp) => {
    if (
      !comp ||
      typeof comp !== 'object' ||
      typeof comp.id !== 'string' ||
      !comp.id ||
      comp.id.length > 255 ||
      compIds.has(comp.id) ||
      typeof comp.name !== 'string' ||
      !comp.name ||
      comp.name.length > 255 ||
      (comp.comment !== undefined &&
        (typeof comp.comment !== 'string' || comp.comment.length > 4096)) ||
      !Array.isArray(comp.states) ||
      comp.states.length > 100
    )
      return false;
    compIds.add(comp.id);
    const stateIds = new Set<string>();
    return comp.states.every((state: PortableCompState) => {
      if (
        !state ||
        typeof state !== 'object' ||
        typeof state.id !== 'string' ||
        !state.id ||
        state.id.length > 255 ||
        stateIds.has(state.id) ||
        typeof state.visible !== 'boolean' ||
        typeof state.x !== 'number' ||
        !Number.isFinite(state.x) ||
        typeof state.y !== 'number' ||
        !Number.isFinite(state.y) ||
        typeof state.opacity !== 'number' ||
        !Number.isFinite(state.opacity) ||
        typeof state.blend !== 'string' ||
        !state.blend ||
        state.blend.length > 64 ||
        ![
          state.fill,
          state.rotation,
          state.scaleX,
          state.scaleY,
          state.brightness,
          state.contrast,
          state.saturation,
          state.blur,
        ].every(finiteOptional)
      )
        return false;
      stateIds.add(state.id);
      return true;
    });
  });
};

export function extractPsdCompAppearance(buffer: ArrayBuffer) {
  const payload = extractPsdResourcePayload(buffer, RESOURCE_ID);
  if (!payload) return undefined;
  if (payload.length > 4 * 1024 * 1024)
    throw Error('PSD layer-comp appearance metadata is too large.');
  const text = new TextDecoder().decode(payload);
  if (!text.startsWith(marker)) return undefined;
  const parsed = JSON.parse(text.slice(marker.length)) as unknown;
  if (!validComps(parsed))
    throw Error('Malformed PSD layer-comp appearance metadata.');
  return parsed;
}

export function injectPsdCompAppearance(
  buffer: ArrayBuffer,
  comps: PortableLayerComp[] | undefined,
) {
  if (!comps?.length) return upsertPsdResource(buffer, RESOURCE_ID, undefined);
  if (!validComps(comps))
    throw Error('Malformed PSD layer-comp appearance metadata.');
  const payload = new TextEncoder().encode(marker + JSON.stringify(comps));
  if (payload.length > 4 * 1024 * 1024)
    throw Error('PSD layer-comp appearance metadata is too large.');
  return upsertPsdResource(buffer, RESOURCE_ID, payload);
}
