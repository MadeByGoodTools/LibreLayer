import {
  isRawDevelopSettings,
  type RawDevelopSettings,
} from './raw-develop.ts';

export type RawRecipeSidecar = {
  format: 'librelayer-raw-recipe';
  version: 1;
  settings: RawDevelopSettings;
  source?: {
    camera?: string;
    lens?: string;
  };
};

export const createRawRecipeSidecar = (
  settings: RawDevelopSettings,
  source?: RawRecipeSidecar['source'],
): RawRecipeSidecar => ({
  format: 'librelayer-raw-recipe',
  version: 1,
  settings: structuredClone(settings),
  source:
    source?.camera || source?.lens
      ? {
          ...(source.camera ? { camera: source.camera } : {}),
          ...(source.lens ? { lens: source.lens } : {}),
        }
      : undefined,
});

export const serializeRawRecipeSidecar = (sidecar: RawRecipeSidecar) =>
  JSON.stringify(sidecar, null, 2);

export const parseRawRecipeSidecar = (input: string): RawRecipeSidecar => {
  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch {
    throw Error('The RAW recipe is not valid JSON.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('The RAW recipe must be an object.');
  const sidecar = value as Record<string, unknown>;
  if (sidecar.format !== 'librelayer-raw-recipe' || sidecar.version !== 1)
    throw Error('This is not a supported LibreLayer RAW recipe.');
  if (!isRawDevelopSettings(sidecar.settings))
    throw Error('The RAW recipe contains unsafe or incomplete settings.');
  if (
    sidecar.source !== undefined &&
    (!sidecar.source ||
      typeof sidecar.source !== 'object' ||
      Array.isArray(sidecar.source) ||
      (Object.hasOwn(sidecar.source, 'camera') &&
        typeof (sidecar.source as Record<string, unknown>).camera !== 'string') ||
      (Object.hasOwn(sidecar.source, 'lens') &&
        typeof (sidecar.source as Record<string, unknown>).lens !== 'string'))
  )
    throw Error('The RAW recipe source metadata is invalid.');
  return {
    format: 'librelayer-raw-recipe',
    version: 1,
    settings: structuredClone(sidecar.settings),
    source: sidecar.source as RawRecipeSidecar['source'] | undefined,
  };
};
