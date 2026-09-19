import type {
  Filter,
  LinkedFile,
  PlacedLayer,
  PlacedLayerFilter,
} from 'ag-psd';

export type PortableSmartFilter = {
  id: string;
  version?: number;
  name: 'Blur' | 'Sharpen' | 'Brightness';
  amount: number;
  opacity: number;
  blend: string;
  enabled: boolean;
};

export type PortableSmartObject = {
  kind: 'embedded' | 'linked';
  sourceName: string;
  sourceData: string;
  filters: PortableSmartFilter[];
  filterMask: boolean;
  instanceId?: string;
  sourceVersion?: number;
  dependencies?: string[];
  embeddedDocument?: unknown;
  transform?: unknown;
  raw?: unknown;
  linkedHandleId?: string;
  linkedStatus?: 'connected' | 'missing';
};

const uuid = /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const px = (value: number) => ({ units: 'Pixels' as const, value });
const neutralColor = { r: 0, g: 0, b: 0 };
const backgroundColor = { r: 255, g: 255, b: 255 };
const blendToPsd = (value: string) =>
  (value === 'source-over'
    ? 'normal'
    : value.replaceAll('-', ' ')) as Filter['blendMode'];
const blendFromPsd = (value: Filter['blendMode']) =>
  value === 'normal' ? 'source-over' : value.replaceAll(' ', '-');
const psdBlendModes = new Set<Filter['blendMode']>([
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

const dataUrlBytes = (value: string) => {
  const match = /^data:([^;,]+);base64,([a-z\d+/=]+)$/i.exec(value);
  if (!match) return undefined;
  try {
    return {
      mime: match[1].toLowerCase(),
      data: Uint8Array.from(atob(match[2]), (character) =>
        character.charCodeAt(0),
      ),
    };
  } catch {
    return undefined;
  }
};

const bytesDataUrl = (mime: string, data: Uint8Array) => {
  let binary = '';
  for (let start = 0; start < data.length; start += 0x8000)
    binary += String.fromCharCode(...data.subarray(start, start + 0x8000));
  return `data:${mime};base64,${btoa(binary)}`;
};

const fileType = (name: string, mime: string) => {
  if (mime === 'image/png' || /\.png$/i.test(name)) return 'png';
  if (mime === 'image/jpeg' || /\.jpe?g$/i.test(name)) return 'JPEG';
  if (mime === 'image/webp' || /\.webp$/i.test(name)) return 'WEBP';
  return undefined;
};
const fileMime = (file: LinkedFile) => {
  if (file.type?.toLowerCase() === 'png' || /\.png$/i.test(file.name))
    return 'image/png';
  if (file.type?.toLowerCase() === 'jpeg' || /\.jpe?g$/i.test(file.name))
    return 'image/jpeg';
  if (file.type?.toLowerCase() === 'webp' || /\.webp$/i.test(file.name))
    return 'image/webp';
  return undefined;
};

function filterToPsd(input: PortableSmartFilter): Filter | undefined {
  if (
    !Number.isFinite(input.amount) ||
    !Number.isFinite(input.opacity) ||
    input.opacity < 0 ||
    input.opacity > 100 ||
    !psdBlendModes.has(blendToPsd(input.blend))
  )
    return undefined;
  const base = {
    name: input.name,
    opacity: input.opacity / 100,
    blendMode: blendToPsd(input.blend),
    enabled: input.enabled,
    hasOptions: true,
    foregroundColor: neutralColor,
    backgroundColor,
  };
  if (input.name === 'Blur')
    return {
      ...base,
      type: 'gaussian blur',
      filter: { radius: px(Math.max(0, input.amount)) },
    };
  if (input.name === 'Brightness')
    return {
      ...base,
      type: 'brightness/contrast',
      filter: { brightness: input.amount, contrast: 0, useLegacy: false },
    };
  if (input.name === 'Sharpen')
    return {
      ...base,
      type: 'smart sharpen',
      filter: {
        amount: input.amount,
        radius: px(1),
        threshold: 0,
        angle: 0,
        moreAccurate: false,
        blur: 'gaussian blur',
        preset: '',
        shadow: { fadeAmount: 0, tonalWidth: 50, radius: 1 },
        highlight: { fadeAmount: 0, tonalWidth: 50, radius: 1 },
      },
    };
  return undefined;
}

function filterFromPsd(input: Filter): PortableSmartFilter | undefined {
  let name: PortableSmartFilter['name'], amount: number;
  if (input.type === 'gaussian blur') {
    if (input.filter.radius.units !== 'Pixels') return undefined;
    name = 'Blur';
    amount = input.filter.radius.value;
  } else if (input.type === 'brightness/contrast') {
    if (input.filter.contrast !== 0 || input.filter.useLegacy) return undefined;
    name = 'Brightness';
    amount = input.filter.brightness;
  } else if (input.type === 'smart sharpen') {
    const value = input.filter;
    if (
      value.radius.units !== 'Pixels' ||
      value.radius.value !== 1 ||
      value.threshold !== 0 ||
      value.angle !== 0 ||
      value.moreAccurate ||
      value.blur !== 'gaussian blur' ||
      value.shadow.fadeAmount !== 0 ||
      value.shadow.tonalWidth !== 50 ||
      value.shadow.radius !== 1 ||
      value.highlight.fadeAmount !== 0 ||
      value.highlight.tonalWidth !== 50 ||
      value.highlight.radius !== 1
    )
      return undefined;
    name = 'Sharpen';
    amount = value.amount;
  } else return undefined;
  return {
    id: crypto.randomUUID(),
    version: 1,
    name,
    amount,
    opacity: input.opacity * 100,
    blend: blendFromPsd(input.blendMode),
    enabled: input.enabled,
  };
}

const neutralTransform = (width: number, height: number) => [
  0,
  0,
  width,
  0,
  width,
  height,
  0,
  height,
];
const sameNumbers = (left: number[], right: number[]) =>
  left.length === right.length &&
  left.every((value, index) => Math.abs(value - right[index]) < 1e-6);

export function smartObjectToPsd(
  input: PortableSmartObject | undefined,
  width: number,
  height: number,
): { placedLayer: PlacedLayer; linkedFile: LinkedFile } | undefined {
  if (
    !input ||
    input.kind !== 'embedded' ||
    input.filterMask ||
    input.embeddedDocument ||
    input.transform ||
    input.raw ||
    input.dependencies?.length ||
    !input.instanceId ||
    !uuid.test(input.instanceId) ||
    width < 1 ||
    height < 1
  )
    return undefined;
  const source = dataUrlBytes(input.sourceData),
    type = source && fileType(input.sourceName, source.mime),
    filters = input.filters.map(filterToPsd);
  if (!source || !type || filters.some((filter) => !filter)) return undefined;
  const filter: PlacedLayerFilter | undefined = filters.length
    ? {
        enabled: true,
        validAtPosition: true,
        maskEnabled: false,
        maskLinked: true,
        maskExtendWithWhite: true,
        list: filters as Filter[],
      }
    : undefined;
  return {
    placedLayer: {
      id: input.instanceId,
      placed: input.instanceId,
      type: 'raster',
      transform: neutralTransform(width, height),
      width,
      height,
      resolution: { units: 'Density', value: 72 },
      filter,
    },
    linkedFile: {
      id: input.instanceId,
      name: input.sourceName,
      type,
      data: source.data,
    },
  };
}

export function psdToSmartObject(
  placed: PlacedLayer | undefined,
  linkedFiles: LinkedFile[] | undefined,
): PortableSmartObject | undefined {
  if (
    !placed ||
    placed.type !== 'raster' ||
    !placed.width ||
    !placed.height ||
    !uuid.test(placed.id) ||
    !sameNumbers(
      placed.transform,
      neutralTransform(placed.width, placed.height),
    ) ||
    (placed.nonAffineTransform &&
      !sameNumbers(placed.nonAffineTransform, placed.transform)) ||
    placed.filter?.maskEnabled
  )
    return undefined;
  const file = linkedFiles?.find(
      (candidate) => candidate.id === (placed.placed ?? placed.id),
    ),
    mime = file && fileMime(file),
    filters = placed.filter?.list.map(filterFromPsd) ?? [];
  if (!file?.data || !mime || filters.some((filter) => !filter))
    return undefined;
  return {
    kind: file.linkedFile ? 'linked' : 'embedded',
    sourceName: file.name || 'Smart Object',
    sourceData: bytesDataUrl(mime, file.data),
    filters: filters as PortableSmartFilter[],
    filterMask: false,
    instanceId: placed.id,
    sourceVersion: 1,
    dependencies: [],
  };
}

export const supportedPsdSmartObject = (
  placed: PlacedLayer | undefined,
  linkedFiles: LinkedFile[] | undefined,
) => Boolean(placed && psdToSmartObject(placed, linkedFiles));
