import { compilePixelExpression } from './safe-expression.ts';

export const FILTER_PLUGIN_FORMAT = 'librelayer-filter-plugin';
export const FILTER_PLUGIN_VERSION = 1;
export const MAX_FILTER_PLUGIN_WASM_BYTES = 1024 * 1024;

export type FilterPluginManifest = {
  format: typeof FILTER_PLUGIN_FORMAT;
  version: typeof FILTER_PLUGIN_VERSION;
  id: string;
  name: string;
  pluginVersion: string;
  cpuKernel: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  wasmBase64?: string;
  javascript?: {
    red: string;
    green: string;
    blue: string;
    alpha?: string;
  };
};

export type FilterPluginResult = {
  pixels: Uint8ClampedArray;
  backend: 'wasm' | 'cpu';
  warning?: string;
};

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const validateFilterPlugin = (value: unknown): FilterPluginManifest => {
  if (!value || typeof value !== 'object')
    throw new Error('The filter plug-in manifest must be a JSON object.');
  const manifest = value as Record<string, unknown>;
  if (manifest.format !== FILTER_PLUGIN_FORMAT || manifest.version !== 1)
    throw new Error('This is not a supported LibreLayer filter plug-in.');
  if (
    typeof manifest.id !== 'string' ||
    !/^[a-z0-9][a-z0-9._-]{1,63}$/i.test(manifest.id)
  )
    throw new Error('The filter plug-in id is invalid.');
  for (const key of ['name', 'pluginVersion'] as const)
    if (
      typeof manifest[key] !== 'string' ||
      !manifest[key] ||
      manifest[key].length > 80
    )
      throw new Error(`The filter plug-in ${key} is invalid.`);
  const id = manifest.id as string,
    name = manifest.name as string,
    pluginVersion = manifest.pluginVersion as string;
  if (
    !Array.isArray(manifest.cpuKernel) ||
    manifest.cpuKernel.length !== 9 ||
    !manifest.cpuKernel.every(finite) ||
    manifest.cpuKernel.reduce((sum, item) => sum + Math.abs(item), 0) > 64
  )
    throw new Error('The CPU fallback must contain nine safe coefficients.');
  if (
    manifest.wasmBase64 !== undefined &&
    (typeof manifest.wasmBase64 !== 'string' ||
      manifest.wasmBase64.length >
        Math.ceil((MAX_FILTER_PLUGIN_WASM_BYTES * 4) / 3) + 4)
  )
    throw new Error('The WebAssembly module is too large.');
  let javascript: FilterPluginManifest['javascript'];
  if (manifest.javascript !== undefined) {
    if (!manifest.javascript || typeof manifest.javascript !== 'object')
      throw new Error('The JavaScript channel expressions are invalid.');
    const channels = manifest.javascript as Record<string, unknown>;
    for (const channel of ['red', 'green', 'blue'])
      if (
        typeof channels[channel] !== 'string' ||
        !channels[channel] ||
        channels[channel].length > 240
      )
        throw new Error(`The JavaScript ${channel} expression is invalid.`);
    if (
      channels.alpha !== undefined &&
      (typeof channels.alpha !== 'string' ||
        !channels.alpha ||
        channels.alpha.length > 240)
    )
      throw new Error('The JavaScript alpha expression is invalid.');
    javascript = {
      red: channels.red as string,
      green: channels.green as string,
      blue: channels.blue as string,
      ...(channels.alpha ? { alpha: channels.alpha as string } : {}),
    };
  }
  return {
    format: FILTER_PLUGIN_FORMAT,
    version: FILTER_PLUGIN_VERSION,
    id,
    name,
    pluginVersion,
    cpuKernel: [...manifest.cpuKernel] as FilterPluginManifest['cpuKernel'],
    ...(manifest.wasmBase64 ? { wasmBase64: manifest.wasmBase64 } : {}),
    ...(javascript ? { javascript } : {}),
  };
};

const decodeBase64 = (encoded: string) => {
  let binary: string;
  try {
    binary = atob(encoded);
  } catch {
    throw new Error('The WebAssembly module is not valid base64.');
  }
  if (binary.length > MAX_FILTER_PLUGIN_WASM_BYTES)
    throw new Error('The WebAssembly module is too large.');
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const clampByte = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)));

const applyJavascriptFilterPlugin = (
  source: Uint8ClampedArray,
  width: number,
  height: number,
  channels: NonNullable<FilterPluginManifest['javascript']>,
  amount: number,
  onProgress?: (progress: number) => void,
) => {
  const red = compilePixelExpression(channels.red),
    green = compilePixelExpression(channels.green),
    blue = compilePixelExpression(channels.blue),
    alpha = channels.alpha ? compilePixelExpression(channels.alpha) : null,
    output = new Uint8ClampedArray(source.length),
    mix = Math.max(0, Math.min(1, amount / 100)),
    progressStride = Math.max(1, Math.floor(height / 20));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4,
        variables = {
          r: source[offset],
          g: source[offset + 1],
          b: source[offset + 2],
          a: source[offset + 3],
          x,
          y,
          width,
          height,
          amount: mix,
        },
        calculated = [
          red(variables),
          green(variables),
          blue(variables),
          alpha ? alpha(variables) : variables.a,
        ];
      for (let channel = 0; channel < 4; channel++)
        output[offset + channel] = clampByte(
          source[offset + channel] * (1 - mix) + calculated[channel] * mix,
        );
    }
    if (y % progressStride === 0 || y === height - 1)
      onProgress?.(Math.round(((y + 1) / height) * 100));
  }
  return output;
};

export const applyCpuFilterPlugin = (
  source: Uint8ClampedArray,
  width: number,
  height: number,
  kernel: FilterPluginManifest['cpuKernel'],
  amount = 100,
  onProgress?: (progress: number) => void,
) => {
  if (source.length !== width * height * 4 || width < 1 || height < 1)
    throw new Error('The filter plug-in received invalid pixel dimensions.');
  const output = new Uint8ClampedArray(source.length),
    mix = Math.max(0, Math.min(1, amount / 100));
  const progressStride = Math.max(1, Math.floor(height / 20));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const target = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        let filtered = 0,
          coefficient = 0;
        for (let ky = -1; ky <= 1; ky++)
          for (let kx = -1; kx <= 1; kx++) {
            const sx = Math.max(0, Math.min(width - 1, x + kx)),
              sy = Math.max(0, Math.min(height - 1, y + ky)),
              weight = kernel[++coefficient - 1];
            filtered += source[(sy * width + sx) * 4 + channel] * weight;
          }
        output[target + channel] = clampByte(
          source[target + channel] * (1 - mix) + filtered * mix,
        );
      }
      output[target + 3] = source[target + 3];
    }
    if (y % progressStride === 0 || y === height - 1)
      onProgress?.(Math.round(((y + 1) / height) * 100));
  }
  return output;
};

const runWasmFilterPlugin = async (
  source: Uint8ClampedArray,
  width: number,
  height: number,
  encoded: string,
  amount: number,
) => {
  const bytes = decodeBase64(encoded),
    compiledModule = await WebAssembly.compile(bytes),
    instance = await WebAssembly.instantiate(compiledModule, {}),
    exports = instance.exports as Record<string, WebAssembly.ExportValue>,
    memory = exports.memory,
    process = exports.process;
  if (!(memory instanceof WebAssembly.Memory) || typeof process !== 'function')
    throw new Error('The module must export memory and process.');
  const pages = Math.ceil(source.byteLength / 65536);
  if (memory.buffer.byteLength < source.byteLength)
    memory.grow(pages - Math.floor(memory.buffer.byteLength / 65536));
  new Uint8Array(memory.buffer, 0, source.byteLength).set(source);
  (process as CallableFunction)(
    0,
    source.byteLength,
    width,
    height,
    Math.max(0, Math.min(100, Math.round(amount))),
  );
  return new Uint8ClampedArray(memory.buffer.slice(0, source.byteLength));
};

export const applyFilterPlugin = async (
  manifestValue: unknown,
  source: Uint8ClampedArray,
  width: number,
  height: number,
  amount = 100,
  onProgress?: (progress: number) => void,
): Promise<FilterPluginResult> => {
  const manifest = validateFilterPlugin(manifestValue),
    original = new Uint8ClampedArray(source);
  if (manifest.javascript)
    return {
      pixels: applyJavascriptFilterPlugin(
        original,
        width,
        height,
        manifest.javascript,
        amount,
        onProgress,
      ),
      backend: 'cpu',
    };
  if (manifest.wasmBase64)
    try {
      onProgress?.(20);
      const pixels = await runWasmFilterPlugin(
        original,
        width,
        height,
        manifest.wasmBase64,
        amount,
      );
      onProgress?.(100);
      return {
        pixels,
        backend: 'wasm',
      };
    } catch (error) {
      return {
        pixels: applyCpuFilterPlugin(
          original,
          width,
          height,
          manifest.cpuKernel,
          amount,
          onProgress,
        ),
        backend: 'cpu',
        warning: error instanceof Error ? error.message : 'WebAssembly failed.',
      };
    }
  return {
    pixels: applyCpuFilterPlugin(
      original,
      width,
      height,
      manifest.cpuKernel,
      amount,
      onProgress,
    ),
    backend: 'cpu',
  };
};
