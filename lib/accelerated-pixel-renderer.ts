import {
  applyCpuReferenceFilter,
  type ReferencePixelOperation,
} from './gpu-filter-reference.ts';

export type AcceleratedPixelBackend = 'webgpu' | 'webgl2' | 'cpu';

export type AcceleratedPixelResult = {
  pixels: Uint8ClampedArray;
  backend: AcceleratedPixelBackend;
  warning?: string;
};

type GpuBufferLike = {
  getMappedRange(): ArrayBuffer;
  mapAsync(mode: number): Promise<void>;
  unmap(): void;
  destroy(): void;
};

type GpuDeviceLike = {
  createBuffer(options: {
    size: number;
    usage: number;
    mappedAtCreation?: boolean;
  }): GpuBufferLike;
  createShaderModule(options: { code: string }): unknown;
  createComputePipeline(options: {
    layout: 'auto';
    compute: { module: unknown; entryPoint: string };
  }): { getBindGroupLayout(index: number): unknown };
  createBindGroup(options: {
    layout: unknown;
    entries: Array<{ binding: number; resource: { buffer: GpuBufferLike } }>;
  }): unknown;
  createCommandEncoder(): {
    beginComputePass(): {
      setPipeline(pipeline: unknown): void;
      setBindGroup(index: number, group: unknown): void;
      dispatchWorkgroups(count: number): void;
      end(): void;
    };
    copyBufferToBuffer(
      source: GpuBufferLike,
      sourceOffset: number,
      destination: GpuBufferLike,
      destinationOffset: number,
      size: number,
    ): void;
    finish(): unknown;
  };
  queue: {
    writeBuffer(
      buffer: GpuBufferLike,
      offset: number,
      data: ArrayBufferView,
    ): void;
    submit(commands: unknown[]): void;
  };
  lost: Promise<unknown>;
};

type GpuNavigator = Navigator & {
  gpu?: {
    requestAdapter(): Promise<{
      requestDevice(): Promise<GpuDeviceLike>;
    } | null>;
  };
};

const BUFFER_MAP_READ = 0x0001,
  BUFFER_COPY_SRC = 0x0004,
  BUFFER_COPY_DST = 0x0008,
  BUFFER_UNIFORM = 0x0040,
  BUFFER_STORAGE = 0x0080,
  MAP_READ = 0x0001;

const WEBGPU_SHADER = `
struct Parameters {
  count: u32,
  operation: u32,
  amount: f32,
  padding: u32,
}

@group(0) @binding(0) var<storage, read> source: array<u32>;
@group(0) @binding(1) var<storage, read_write> output: array<u32>;
@group(0) @binding(2) var<uniform> parameters: Parameters;

fn byte(pixel: u32, shift: u32) -> f32 {
  return f32((pixel >> shift) & 255u);
}

fn channel(value: f32) -> u32 {
  return u32(clamp(round(value), 0.0, 255.0));
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) invocation: vec3<u32>) {
  let index = invocation.x;
  if (index >= parameters.count) {
    return;
  }
  let packed = source[index];
  let original = vec3<f32>(
    byte(packed, 0u),
    byte(packed, 8u),
    byte(packed, 16u)
  );
  var adjusted = original;
  if (parameters.operation == 0u) {
    adjusted = vec3<f32>(255.0) - original;
  } else if (parameters.operation == 1u) {
    let luminance = dot(original, vec3<f32>(0.299, 0.587, 0.114));
    adjusted = vec3<f32>(luminance);
  } else {
    adjusted = vec3<f32>(128.0) + (original - vec3<f32>(128.0)) * 1.25;
  }
  let mixed = original + (adjusted - original) * parameters.amount;
  output[index] =
    channel(mixed.r) |
    (channel(mixed.g) << 8u) |
    (channel(mixed.b) << 16u) |
    (packed & 0xff000000u);
}
`;

let cachedDevice: Promise<GpuDeviceLike | null> | null = null;

const webGpuDevice = () => {
  if (cachedDevice) return cachedDevice;
  cachedDevice = (async () => {
    const adapter = await (navigator as GpuNavigator).gpu?.requestAdapter();
    if (!adapter) return null;
    const device = (await adapter.requestDevice()) as unknown as GpuDeviceLike;
    void device.lost.then(() => {
      cachedDevice = null;
    });
    return device;
  })().catch(() => null);
  return cachedDevice;
};

const operationIndex = (operation: ReferencePixelOperation) =>
  operation === 'invert' ? 0 : operation === 'grayscale' ? 1 : 2;

const applyWebGpu = async (
  source: Uint8ClampedArray,
  operation: ReferencePixelOperation,
  amount: number,
) => {
  const device = await webGpuDevice();
  if (!device) throw new Error('WebGPU is unavailable.');
  const byteLength = Math.max(4, source.byteLength),
    sourceBuffer = device.createBuffer({
      size: byteLength,
      usage: BUFFER_STORAGE | BUFFER_COPY_DST,
    }),
    outputBuffer = device.createBuffer({
      size: byteLength,
      usage: BUFFER_STORAGE | BUFFER_COPY_SRC,
    }),
    readBuffer = device.createBuffer({
      size: byteLength,
      usage: BUFFER_COPY_DST | BUFFER_MAP_READ,
    }),
    parameterBuffer = device.createBuffer({
      size: 16,
      usage: BUFFER_UNIFORM | BUFFER_COPY_DST,
    });
  try {
    const parameters = new ArrayBuffer(16),
      parameterView = new DataView(parameters);
    parameterView.setUint32(0, source.length / 4, true);
    parameterView.setUint32(4, operationIndex(operation), true);
    parameterView.setFloat32(8, Math.max(0, Math.min(1, amount)), true);
    device.queue.writeBuffer(sourceBuffer, 0, source);
    device.queue.writeBuffer(parameterBuffer, 0, new Uint8Array(parameters));
    const shaderModule = device.createShaderModule({ code: WEBGPU_SHADER }),
      pipeline = device.createComputePipeline({
        layout: 'auto',
        compute: { module: shaderModule, entryPoint: 'main' },
      }),
      group = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: sourceBuffer } },
          { binding: 1, resource: { buffer: outputBuffer } },
          { binding: 2, resource: { buffer: parameterBuffer } },
        ],
      }),
      encoder = device.createCommandEncoder(),
      pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    pass.dispatchWorkgroups(Math.ceil(source.length / 4 / 64));
    pass.end();
    encoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, byteLength);
    device.queue.submit([encoder.finish()]);
    await readBuffer.mapAsync(MAP_READ);
    const pixels = new Uint8ClampedArray(
      readBuffer.getMappedRange().slice(0, source.byteLength),
    );
    readBuffer.unmap();
    return pixels;
  } finally {
    sourceBuffer.destroy();
    outputBuffer.destroy();
    readBuffer.destroy();
    parameterBuffer.destroy();
  }
};

const vertexShader = `#version 300 es
out vec2 textureCoordinate;
void main() {
  vec2 position = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  textureCoordinate = position;
  gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
}`;

const fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D sourceTexture;
uniform int operation;
uniform float amount;
in vec2 textureCoordinate;
out vec4 outputColor;
void main() {
  vec4 source = texture(sourceTexture, textureCoordinate);
  vec3 result;
  if (operation == 0) result = vec3(1.0) - source.rgb;
  else if (operation == 1) {
    float luminance = dot(source.rgb, vec3(0.299, 0.587, 0.114));
    result = vec3(luminance);
  } else result = vec3(0.5) + (source.rgb - vec3(0.5)) * 1.25;
  outputColor = vec4(mix(source.rgb, result, amount), source.a);
}`;

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('WebGL2 shader creation failed.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'WebGL2 shader failed.';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
};

const applyWebGl = (
  source: Uint8ClampedArray,
  width: number,
  height: number,
  operation: ReferencePixelOperation,
  amount: number,
) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) throw new Error('WebGL2 is unavailable.');
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexShader),
    fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentShader),
    program = gl.createProgram(),
    texture = gl.createTexture();
  if (!program || !texture) throw new Error('WebGL2 resources failed.');
  try {
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(program) || 'WebGL2 link failed.');
    gl.viewport(0, 0, width, height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      source,
    );
    gl.useProgram(program);
    gl.uniform1i(gl.getUniformLocation(program, 'sourceTexture'), 0);
    gl.uniform1i(
      gl.getUniformLocation(program, 'operation'),
      operationIndex(operation),
    );
    gl.uniform1f(gl.getUniformLocation(program, 'amount'), amount);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const output = new Uint8ClampedArray(source.length);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, output);
    if (gl.getError() !== gl.NO_ERROR)
      throw new Error('WebGL2 pixel readback failed.');
    return output;
  } finally {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    gl.deleteTexture(texture);
    gl.deleteProgram(program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.width = canvas.height = 1;
  }
};

export const applyAcceleratedPixelFilter = async (
  source: Uint8ClampedArray,
  width: number,
  height: number,
  operation: ReferencePixelOperation,
  amount = 1,
  signal?: AbortSignal,
): Promise<AcceleratedPixelResult> => {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    source.length !== width * height * 4
  )
    throw new Error('Accelerated pixel dimensions are invalid.');
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  let webGpuWarning: string | undefined;
  try {
    const pixels = await applyWebGpu(source, operation, amount);
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return { pixels, backend: 'webgpu' };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw error;
    webGpuWarning =
      error instanceof Error ? error.message : 'WebGPU failed safely.';
  }
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  try {
    return {
      pixels: applyWebGl(source, width, height, operation, amount),
      backend: 'webgl2',
      warning: webGpuWarning,
    };
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return {
      pixels: applyCpuReferenceFilter(source, operation, amount),
      backend: 'cpu',
      warning: [
        webGpuWarning,
        error instanceof Error ? error.message : 'WebGL2 failed safely.',
      ]
        .filter(Boolean)
        .join(' '),
    };
  }
};
