import {
  FILTER_PLUGIN_FORMAT,
  FILTER_PLUGIN_VERSION,
  validateFilterPlugin,
  type FilterPluginManifest,
} from './filter-plugin.ts';
import { compilePixelExpression } from './safe-expression.ts';

export const PLUGIN_FORMAT = 'librelayer-plugin';
export const PLUGIN_MANIFEST_VERSION = 1;
export const PLUGIN_HOST_API_VERSION = 1;
export const MAX_PLUGIN_FILE_BYTES = 1_500_000;

export const PLUGIN_PERMISSIONS = [
  'document.readPixels',
  'document.writePixels',
  'document.readComposite',
  'panel.show',
  'storage.settings',
  'export.download',
] as const;
export type PluginPermission = (typeof PLUGIN_PERMISSIONS)[number];

export type PluginControl = {
  id: string;
  label: string;
  kind: 'slider' | 'checkbox' | 'color' | 'text';
  default: number | boolean | string;
  min?: number;
  max?: number;
};

export type PluginFilter = {
  id: string;
  label: string;
  cpuKernel: FilterPluginManifest['cpuKernel'];
  wasmBase64?: string;
  javascript?: {
    red: string;
    green: string;
    blue: string;
    alpha?: string;
  };
};

export type PluginExporter = {
  id: string;
  label: string;
  format: 'png' | 'jpeg' | 'webp';
  extension: string;
  quality?: number;
};

export type LibreLayerPluginManifest = {
  format: typeof PLUGIN_FORMAT;
  manifestVersion: typeof PLUGIN_MANIFEST_VERSION;
  id: string;
  name: string;
  version: string;
  description?: string;
  hostApi: 1;
  permissions: PluginPermission[];
  contributes: {
    panel?: {
      title: string;
      controls: PluginControl[];
    };
    filters?: PluginFilter[];
    exporters?: PluginExporter[];
  };
};

const safeId = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9._-]{1,63}$/i.test(value))
    throw new Error(`The plug-in ${label} is invalid.`);
  return value;
};

const safeText = (value: unknown, label: string, maximum = 100) => {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum)
    throw new Error(`The plug-in ${label} is invalid.`);
  return value.trim();
};

const requirePermissions = (
  permissions: Set<PluginPermission>,
  required: PluginPermission[],
  capability: string,
) => {
  const missing = required.filter((permission) => !permissions.has(permission));
  if (missing.length)
    throw new Error(
      `${capability} requires the ${missing.join(', ')} permission${missing.length === 1 ? '' : 's'}.`,
    );
};

const validateControl = (value: unknown): PluginControl => {
  if (!value || typeof value !== 'object')
    throw new Error('A plug-in panel control is invalid.');
  const control = value as Record<string, unknown>,
    id = safeId(control.id, 'control id'),
    label = safeText(control.label, 'control label', 80);
  if (!['slider', 'checkbox', 'color', 'text'].includes(String(control.kind)))
    throw new Error(`The ${label} panel control type is unsupported.`);
  const kind = control.kind as PluginControl['kind'];
  if (
    (kind === 'slider' && typeof control.default !== 'number') ||
    (kind === 'checkbox' && typeof control.default !== 'boolean') ||
    ((kind === 'color' || kind === 'text') &&
      typeof control.default !== 'string')
  )
    throw new Error(`The ${label} panel control default is invalid.`);
  if (kind === 'color' && !/^#[0-9a-f]{6}$/i.test(String(control.default)))
    throw new Error(`The ${label} color default is invalid.`);
  const min = Number.isFinite(control.min) ? Number(control.min) : 0,
    max = Number.isFinite(control.max) ? Number(control.max) : 100;
  if (
    kind === 'slider' &&
    (min >= max ||
      Number(control.default) < min ||
      Number(control.default) > max)
  )
    throw new Error(`The ${label} slider range is invalid.`);
  return {
    id,
    label,
    kind,
    default: control.default as PluginControl['default'],
    ...(kind === 'slider' ? { min, max } : {}),
  };
};

export const validatePluginManifest = (
  value: unknown,
): LibreLayerPluginManifest => {
  if (!value || typeof value !== 'object')
    throw new Error('The plug-in manifest must be a JSON object.');
  const input = value as Record<string, unknown>;
  if (
    input.format !== PLUGIN_FORMAT ||
    input.manifestVersion !== PLUGIN_MANIFEST_VERSION ||
    input.hostApi !== PLUGIN_HOST_API_VERSION
  )
    throw new Error('This LibreLayer plug-in format is unsupported.');
  const id = safeId(input.id, 'id'),
    name = safeText(input.name, 'name'),
    version = safeText(input.version, 'version', 32);
  if (!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i.test(version))
    throw new Error('The plug-in version must use semantic versioning.');
  if (!Array.isArray(input.permissions))
    throw new Error('The plug-in must declare its permissions.');
  const permissions = [...new Set(input.permissions)];
  if (
    permissions.length > PLUGIN_PERMISSIONS.length ||
    permissions.some(
      (permission) =>
        typeof permission !== 'string' ||
        !PLUGIN_PERMISSIONS.includes(permission as PluginPermission),
    )
  )
    throw new Error('The plug-in requests an unsupported permission.');
  const permissionSet = new Set(permissions as PluginPermission[]),
    contributes = input.contributes;
  if (!contributes || typeof contributes !== 'object')
    throw new Error(
      'The plug-in must contribute a panel, filter, or exporter.',
    );
  const raw = contributes as Record<string, unknown>,
    output: LibreLayerPluginManifest['contributes'] = {};
  if (raw.panel !== undefined) {
    requirePermissions(
      permissionSet,
      ['panel.show', 'storage.settings'],
      'A panel',
    );
    if (!raw.panel || typeof raw.panel !== 'object')
      throw new Error('The plug-in panel is invalid.');
    const panel = raw.panel as Record<string, unknown>;
    if (!Array.isArray(panel.controls) || panel.controls.length > 24)
      throw new Error('A plug-in panel can contain up to 24 controls.');
    const controls = panel.controls.map(validateControl);
    if (new Set(controls.map((control) => control.id)).size !== controls.length)
      throw new Error('Plug-in panel control ids must be unique.');
    output.panel = {
      title: safeText(panel.title, 'panel title', 80),
      controls,
    };
  }
  if (raw.filters !== undefined) {
    requirePermissions(
      permissionSet,
      ['document.readPixels', 'document.writePixels'],
      'A filter',
    );
    if (
      !Array.isArray(raw.filters) ||
      !raw.filters.length ||
      raw.filters.length > 24
    )
      throw new Error('A plug-in can contribute 1–24 filters.');
    output.filters = raw.filters.map((value) => {
      if (!value || typeof value !== 'object')
        throw new Error('A plug-in filter is invalid.');
      const filter = value as Record<string, unknown>,
        result: PluginFilter = {
          id: safeId(filter.id, 'filter id'),
          label: safeText(filter.label, 'filter label', 80),
          cpuKernel: Array.isArray(filter.cpuKernel)
            ? ([...filter.cpuKernel] as PluginFilter['cpuKernel'])
            : ([0, 0, 0, 0, 1, 0, 0, 0, 0] as PluginFilter['cpuKernel']),
        };
      const checked = validateFilterPlugin({
        format: FILTER_PLUGIN_FORMAT,
        version: FILTER_PLUGIN_VERSION,
        id: `${id}.${result.id}`.slice(0, 64),
        name: result.label,
        pluginVersion: version,
        cpuKernel: result.cpuKernel,
        ...(typeof filter.wasmBase64 === 'string'
          ? { wasmBase64: filter.wasmBase64 }
          : {}),
      });
      result.cpuKernel = checked.cpuKernel;
      if (checked.wasmBase64) result.wasmBase64 = checked.wasmBase64;
      if (filter.javascript !== undefined) {
        if (!filter.javascript || typeof filter.javascript !== 'object')
          throw new Error(`${result.label} has invalid JavaScript channels.`);
        const channels = filter.javascript as Record<string, unknown>;
        for (const channel of ['red', 'green', 'blue'])
          safeText(
            channels[channel],
            `${result.label} ${channel} expression`,
            240,
          );
        if (channels.alpha !== undefined)
          safeText(channels.alpha, `${result.label} alpha expression`, 240);
        result.javascript = {
          red: channels.red as string,
          green: channels.green as string,
          blue: channels.blue as string,
          ...(channels.alpha ? { alpha: channels.alpha as string } : {}),
        };
        compilePixelExpression(result.javascript.red);
        compilePixelExpression(result.javascript.green);
        compilePixelExpression(result.javascript.blue);
        if (result.javascript.alpha)
          compilePixelExpression(result.javascript.alpha);
      }
      return result;
    });
    if (
      new Set(output.filters.map((filter) => filter.id)).size !==
      output.filters.length
    )
      throw new Error('Plug-in filter ids must be unique.');
  }
  if (raw.exporters !== undefined) {
    requirePermissions(
      permissionSet,
      ['document.readComposite', 'export.download'],
      'An exporter',
    );
    if (
      !Array.isArray(raw.exporters) ||
      !raw.exporters.length ||
      raw.exporters.length > 12
    )
      throw new Error('A plug-in can contribute 1–12 exporters.');
    output.exporters = raw.exporters.map((value) => {
      if (!value || typeof value !== 'object')
        throw new Error('A plug-in exporter is invalid.');
      const exporter = value as Record<string, unknown>;
      if (!['png', 'jpeg', 'webp'].includes(String(exporter.format)))
        throw new Error('Plug-in exporters support PNG, JPEG, or WebP.');
      const extension = safeText(exporter.extension, 'export extension', 12);
      if (!/^[a-z0-9]{2,12}$/i.test(extension))
        throw new Error('The plug-in export extension is invalid.');
      const quality =
        exporter.quality === undefined ? undefined : Number(exporter.quality);
      if (
        quality !== undefined &&
        (!Number.isFinite(quality) || quality < 0 || quality > 1)
      )
        throw new Error('The plug-in export quality must be between 0 and 1.');
      return {
        id: safeId(exporter.id, 'exporter id'),
        label: safeText(exporter.label, 'exporter label', 80),
        format: exporter.format as PluginExporter['format'],
        extension,
        ...(quality === undefined ? {} : { quality }),
      };
    });
    if (
      new Set(output.exporters.map((exporter) => exporter.id)).size !==
      output.exporters.length
    )
      throw new Error('Plug-in exporter ids must be unique.');
  }
  if (!output.panel && !output.filters?.length && !output.exporters?.length)
    throw new Error('The plug-in does not contribute anything usable.');
  return {
    format: PLUGIN_FORMAT,
    manifestVersion: PLUGIN_MANIFEST_VERSION,
    id,
    name,
    version,
    ...(typeof input.description === 'string' && input.description.trim()
      ? { description: input.description.trim().slice(0, 240) }
      : {}),
    hostApi: PLUGIN_HOST_API_VERSION,
    permissions: permissions as PluginPermission[],
    contributes: output,
  };
};

const versionParts = (version: string) =>
  version
    .split(/[.-]/)
    .slice(0, 3)
    .map((part) => Number(part) || 0);

export const comparePluginVersions = (left: string, right: string) => {
  const a = versionParts(left),
    b = versionParts(right);
  for (let index = 0; index < 3; index++)
    if (a[index] !== b[index]) return a[index] - b[index];
  return 0;
};

export const installPlugin = (
  installed: LibreLayerPluginManifest[],
  manifestValue: unknown,
) => {
  const manifest = validatePluginManifest(manifestValue),
    existing = installed.find((plugin) => plugin.id === manifest.id);
  if (existing && comparePluginVersions(manifest.version, existing.version) < 0)
    throw new Error(
      `${manifest.name} ${existing.version} is newer. Remove it before installing an older version.`,
    );
  return [
    manifest,
    ...installed.filter((plugin) => plugin.id !== manifest.id),
  ].slice(0, 32);
};

export const pluginFilterManifest = (
  plugin: LibreLayerPluginManifest,
  filter: PluginFilter,
): FilterPluginManifest =>
  validateFilterPlugin({
    format: FILTER_PLUGIN_FORMAT,
    version: FILTER_PLUGIN_VERSION,
    id: `${plugin.id}.${filter.id}`.slice(0, 64),
    name: `${plugin.name} · ${filter.label}`.slice(0, 80),
    pluginVersion: plugin.version,
    cpuKernel: filter.cpuKernel,
    ...(filter.wasmBase64 ? { wasmBase64: filter.wasmBase64 } : {}),
    ...(filter.javascript ? { javascript: filter.javascript } : {}),
  });
