export type ReferencePixelOperation = 'invert' | 'grayscale' | 'contrast';

const clampByte = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

export const applyCpuReferenceFilter = (
  source: Uint8ClampedArray,
  operation: ReferencePixelOperation,
  amount: number,
) => {
  const output = new Uint8ClampedArray(source),
    mix = Math.max(0, Math.min(1, amount));
  for (let index = 0; index < output.length; index += 4) {
    const r = source[index],
      g = source[index + 1],
      b = source[index + 2];
    let next: [number, number, number];
    if (operation === 'invert') next = [255 - r, 255 - g, 255 - b];
    else if (operation === 'grayscale') {
      const luminance = r * 0.299 + g * 0.587 + b * 0.114;
      next = [luminance, luminance, luminance];
    } else
      next = [r, g, b].map((channel) =>
        128 + (channel - 128) * 1.25,
      ) as [number, number, number];
    output[index] = clampByte(r + (next[0] - r) * mix);
    output[index + 1] = clampByte(g + (next[1] - g) * mix);
    output[index + 2] = clampByte(b + (next[2] - b) * mix);
    output[index + 3] = source[index + 3];
  }
  return output;
};

export const maximumPixelDelta = (
  left: Uint8ClampedArray,
  right: Uint8ClampedArray,
) => {
  if (left.length !== right.length)
    throw new Error('Reference pixel buffers must have matching lengths.');
  let maximum = 0;
  for (let index = 0; index < left.length; index++)
    maximum = Math.max(maximum, Math.abs(left[index] - right[index]));
  return maximum;
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

const compileShader = (
  gl: WebGL2RenderingContext,
  kind: number,
  source: string,
) => {
  const shader = gl.createShader(kind);
  if (!shader) throw new Error('The GPU could not create a reference shader.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const reason = gl.getShaderInfoLog(shader) || 'Unknown shader error';
    gl.deleteShader(shader);
    throw new Error(`GPU reference shader failed: ${reason}`);
  }
  return shader;
};

export const runGpuCpuReferenceCheck = (
  canvas: HTMLCanvasElement,
  tolerance = 1,
) => {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) return { supported: false, passed: true, maximumDelta: 0 };
  canvas.width = canvas.height = 2;
  gl.viewport(0, 0, 2, 2);
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShader),
    fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader),
    program = gl.createProgram();
  if (!program) throw new Error('The GPU could not create a reference program.');
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(
      `GPU reference program failed: ${gl.getProgramInfoLog(program) || 'Unknown link error'}`,
    );
  const texture = gl.createTexture();
  if (!texture) throw new Error('The GPU could not create a reference texture.');
  const source = new Uint8ClampedArray([
    12, 34, 56, 255, 210, 170, 90, 255, 0, 127, 255, 255, 253, 2, 129, 255,
  ]);
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
    2,
    2,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    source,
  );
  gl.useProgram(program);
  gl.uniform1i(gl.getUniformLocation(program, 'sourceTexture'), 0);
  gl.uniform1f(gl.getUniformLocation(program, 'amount'), 0.65);
  const operations: ReferencePixelOperation[] = ['invert', 'grayscale', 'contrast'];
  let maximumDelta = 0;
  for (let index = 0; index < operations.length; index++) {
    gl.uniform1i(gl.getUniformLocation(program, 'operation'), index);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const gpu = new Uint8ClampedArray(source.length);
    gl.readPixels(0, 0, 2, 2, gl.RGBA, gl.UNSIGNED_BYTE, gpu);
    const cpu = applyCpuReferenceFilter(source, operations[index], 0.65);
    maximumDelta = Math.max(maximumDelta, maximumPixelDelta(cpu, gpu));
  }
  gl.deleteTexture(texture);
  gl.deleteProgram(program);
  return {
    supported: true,
    passed: maximumDelta <= tolerance,
    maximumDelta,
  };
};
