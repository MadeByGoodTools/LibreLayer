// Compiled from lib/wasm/invert-simd.wat. Keeping the audited WAT beside the
// embedded module makes the browser build independent from a runtime compiler.
const INVERT_SIMD_BASE64 =
  'AGFzbQEAAAABCQFgBX9/f39/AAMCAQAFAwEAAgcUAgZtZW1vcnkCAAdwcm9jZXNzAAAKjgEBiwEBAn8gACABaiEFIAUgAUEPcWshBgJAA0AgACAGTw0BIAAgAP0ABAD9DP///wD///8A////AP///wD9Uf0LBAAgAEEQaiEADAALCwJAA0AgACAFTw0BIABB/wEgAC0AAGs6AAAgAEH/ASAALQABazoAASAAQf8BIAAtAAJrOgACIABBBGohAAwACwsL';

let compiledKernel: Promise<WebAssembly.Module> | null = null;

const decodeKernel = () => {
  const binary = atob(INVERT_SIMD_BASE64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const kernel = () => {
  compiledKernel ??= WebAssembly.compile(decodeKernel()).catch((error) => {
    compiledKernel = null;
    throw error;
  });
  return compiledKernel;
};

export const resetWasmSimdKernelForTests = () => {
  compiledKernel = null;
};

export const applyWasmSimdInvert = async (
  source: Uint8ClampedArray,
  width: number,
  height: number,
) => {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    source.length !== width * height * 4
  )
    throw new Error('The SIMD filter received invalid pixel dimensions.');
  const instance = await WebAssembly.instantiate(await kernel(), {}),
    exports = instance.exports as Record<string, WebAssembly.ExportValue>,
    memory = exports.memory,
    process = exports.process;
  if (!(memory instanceof WebAssembly.Memory) || typeof process !== 'function')
    throw new Error('The SIMD kernel exports are invalid.');
  const requiredPages = Math.ceil(source.byteLength / 65536);
  if (memory.buffer.byteLength < source.byteLength)
    memory.grow(requiredPages - memory.buffer.byteLength / 65536);
  const pixels = new Uint8ClampedArray(memory.buffer, 0, source.length);
  pixels.set(source);
  (process as CallableFunction)(0, source.byteLength, width, height, 100);
  return new Uint8ClampedArray(pixels);
};
