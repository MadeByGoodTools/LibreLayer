import { BoundedResourcePool } from './render-target-pool.ts';

export type BrushRendererBackend = 'webgl2' | 'canvas2d';

export type BrushDab = {
  x: number;
  y: number;
  size: number;
  alpha: number;
  angle: number;
  roundness: number;
};

export type BrushTileBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RenderedBrushTile = BrushTileBounds & {
  canvas: HTMLCanvasElement;
  release(): void;
};

type WebGlRenderTarget = {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  width: number;
  height: number;
};

const gpuTargetDimension = (value: number) =>
  Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;

export const gpuTextureTargetKey = (width: number, height: number) =>
  `${gpuTargetDimension(width)}x${gpuTargetDimension(height)}`;

export const gpuTextureTargetCost = (width: number, height: number) =>
  gpuTargetDimension(width) * gpuTargetDimension(height) * 4;

const VERTEX_SHADER = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec2 a_center;
layout(location = 2) in vec2 a_radius;
layout(location = 3) in float a_angle;
layout(location = 4) in float a_alpha;
uniform vec2 u_resolution;
uniform vec2 u_origin;
out vec2 v_local;
out float v_alpha;
void main() {
  float c = cos(a_angle);
  float s = sin(a_angle);
  vec2 scaled = a_corner * a_radius;
  vec2 rotated = vec2(
    scaled.x * c - scaled.y * s,
    scaled.x * s + scaled.y * c
  );
  vec2 pixel = a_center - u_origin + rotated;
  vec2 clip = vec2(
    pixel.x / u_resolution.x * 2.0 - 1.0,
    1.0 - pixel.y / u_resolution.y * 2.0
  );
  gl_Position = vec4(clip, 0.0, 1.0);
  v_local = a_corner;
  v_alpha = a_alpha;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_local;
in float v_alpha;
uniform vec3 u_color;
uniform float u_hardness;
out vec4 out_color;
void main() {
  float distanceFromCenter = length(v_local);
  if (distanceFromCenter > 1.0) discard;
  float coverage = u_hardness >= 0.999
    ? 1.0
    : 1.0 - smoothstep(u_hardness, 1.0, distanceFromCenter);
  float alpha = coverage * v_alpha;
  out_color = vec4(u_color * alpha, alpha);
}`;

const finiteDab = (dab: BrushDab) =>
  Number.isFinite(dab.x) &&
  Number.isFinite(dab.y) &&
  Number.isFinite(dab.size) &&
  Number.isFinite(dab.alpha) &&
  Number.isFinite(dab.angle) &&
  Number.isFinite(dab.roundness) &&
  dab.size > 0 &&
  dab.alpha > 0;

export const brushTileBounds = (dabs: BrushDab[]): BrushTileBounds | null => {
  const usable = dabs.filter(finiteDab);
  if (!usable.length) return null;
  let left = Infinity,
    top = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const dab of usable) {
    const radius = Math.max(0.5, dab.size / 2) + 2;
    left = Math.min(left, dab.x - radius);
    top = Math.min(top, dab.y - radius);
    right = Math.max(right, dab.x + radius);
    bottom = Math.max(bottom, dab.y + radius);
  }
  const x = Math.floor(left),
    y = Math.floor(top);
  return {
    x,
    y,
    width: Math.max(1, Math.ceil(right) - x),
    height: Math.max(1, Math.ceil(bottom) - y),
  };
};

export const partitionBrushDabs = (dabs: BrushDab[], maxTileSize = 2048) => {
  const limit = Math.max(64, Math.floor(maxTileSize)),
    groups: BrushDab[][] = [];
  let group: BrushDab[] = [];
  for (const dab of dabs.filter(finiteDab)) {
    const candidate = [...group, dab],
      bounds = brushTileBounds(candidate)!;
    if (group.length && (bounds.width > limit || bounds.height > limit)) {
      groups.push(group);
      group = [dab];
    } else group = candidate;
  }
  if (group.length) groups.push(group);
  return groups;
};

const parseHex = (color: string) => {
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (!match) return [0, 0, 0] as const;
  const value = Number.parseInt(match[1], 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ] as const;
};

const compileShader = (
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
) => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Brush shader could not be created.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Brush shader failed.';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
};

const createProgram = (gl: WebGL2RenderingContext) => {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER),
    fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER),
    program = gl.createProgram();
  if (!program) throw new Error('Brush program could not be created.');
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'Brush program failed.';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
};

export class GpuBrushRenderer {
  canvas: HTMLCanvasElement;
  readonly backend: BrushRendererBackend;
  lastRenderPath: 'webgl2-pooled' | 'canvas2d-texture-fallback' | 'canvas2d' =
    'canvas2d';
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private cornerBuffer: WebGLBuffer | null = null;
  private instanceBuffer: WebGLBuffer | null = null;
  private gpuTargetPool: BoundedResourcePool<WebGlRenderTarget> | null = null;
  private readonly tilePool = new BoundedResourcePool<HTMLCanvasElement>(
    64 * 1024 * 1024,
    (canvas) => {
      canvas.width = canvas.height = 1;
    },
  );

  constructor() {
    this.canvas = document.createElement('canvas');
    try {
      const gl = this.canvas.getContext('webgl2', {
        alpha: true,
        antialias: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: true,
      });
      if (!gl) throw new Error('WebGL2 unavailable.');
      this.gl = gl;
      this.program = createProgram(gl);
      this.cornerBuffer = gl.createBuffer();
      this.instanceBuffer = gl.createBuffer();
      if (!this.cornerBuffer || !this.instanceBuffer)
        throw new Error('Brush buffers could not be created.');
      this.gpuTargetPool = new BoundedResourcePool<WebGlRenderTarget>(
        64 * 1024 * 1024,
        (target) => this.destroyGpuTarget(target),
      );
      this.backend = 'webgl2';
      const selfTestBounds = { x: 0, y: 0, width: 16, height: 16 };
      this.resize(selfTestBounds.width, selfTestBounds.height);
      this.renderWebGl(
        [
          {
            x: 8,
            y: 8,
            size: 8,
            alpha: 1,
            angle: 0,
            roundness: 1,
          },
        ],
        selfTestBounds,
        '#ffffff',
        1,
      );
      const center = new Uint8Array(4);
      gl.readPixels(8, 7, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, center);
      if (center[3] < 240) throw new Error('Brush GPU self-test failed.');
    } catch {
      this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
      this.canvas = document.createElement('canvas');
      this.gl = null;
      this.program = null;
      this.cornerBuffer = null;
      this.instanceBuffer = null;
      this.gpuTargetPool = null;
      this.backend = 'canvas2d';
    }
  }

  private resize(width: number, height: number) {
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
  }

  private destroyGpuTarget(target: WebGlRenderTarget) {
    if (!this.gl) return;
    this.gl.deleteFramebuffer(target.framebuffer);
    this.gl.deleteTexture(target.texture);
  }

  private createGpuTarget(width: number, height: number): WebGlRenderTarget {
    const gl = this.gl!,
      texture = gl.createTexture(),
      framebuffer = gl.createFramebuffer();
    if (!texture || !framebuffer) {
      if (texture) gl.deleteTexture(texture);
      if (framebuffer) gl.deleteFramebuffer(framebuffer);
      throw new Error('GPU brush target could not be created.');
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );
    const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    if (complete !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteFramebuffer(framebuffer);
      gl.deleteTexture(texture);
      throw new Error('GPU brush target is incomplete.');
    }
    return { texture, framebuffer, width, height };
  }

  private readGpuTarget(
    target: WebGlRenderTarget,
    bounds: BrushTileBounds,
    sample: BrushDab,
    canvas: HTMLCanvasElement,
  ) {
    const gl = this.gl!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.getError();
    const pixels = new Uint8Array(target.width * target.height * 4);
    gl.readPixels(
      0,
      0,
      target.width,
      target.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );
    const failed = gl.getError() !== gl.NO_ERROR,
      x = Math.max(
        0,
        Math.min(target.width - 1, Math.round(sample.x - bounds.x)),
      ),
      y = Math.max(
        0,
        Math.min(
          target.height - 1,
          target.height - 1 - Math.round(sample.y - bounds.y),
        ),
      ),
      sampleAlpha = pixels[(y * target.width + x) * 4 + 3];
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (failed || sampleAlpha === 0)
      throw new Error('GPU brush target validation failed.');
    const flipped = new Uint8ClampedArray(pixels.length),
      rowBytes = target.width * 4;
    for (let sourceY = 0; sourceY < target.height; sourceY++) {
      const sourceOffset = sourceY * rowBytes,
        targetOffset = (target.height - sourceY - 1) * rowBytes;
      for (let offset = 0; offset < rowBytes; offset += 4) {
        const alpha = pixels[sourceOffset + offset + 3],
          scale = alpha ? 255 / alpha : 0;
        flipped[targetOffset + offset] = Math.min(
          255,
          Math.round(pixels[sourceOffset + offset] * scale),
        );
        flipped[targetOffset + offset + 1] = Math.min(
          255,
          Math.round(pixels[sourceOffset + offset + 1] * scale),
        );
        flipped[targetOffset + offset + 2] = Math.min(
          255,
          Math.round(pixels[sourceOffset + offset + 2] * scale),
        );
        flipped[targetOffset + offset + 3] = alpha;
      }
    }
    canvas
      .getContext('2d')!
      .putImageData(new ImageData(flipped, target.width, target.height), 0, 0);
  }

  private renderCanvas2d(
    dabs: BrushDab[],
    bounds: BrushTileBounds,
    color: string,
    hardness: number,
    canvas = this.canvas,
  ) {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, bounds.width, bounds.height);
    for (const dab of dabs) {
      const radius = dab.size / 2,
        inner = radius * hardness,
        gradient = ctx.createRadialGradient(0, 0, inner, 0, 0, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(Math.min(0.999, hardness), color);
      gradient.addColorStop(1, `${color}00`);
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, dab.alpha));
      ctx.translate(dab.x - bounds.x, dab.y - bounds.y);
      ctx.rotate(dab.angle);
      ctx.scale(1, Math.max(0.05, Math.min(1, dab.roundness)));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderWebGl(
    dabs: BrushDab[],
    bounds: BrushTileBounds,
    color: string,
    hardness: number,
    framebuffer: WebGLFramebuffer | null = null,
  ) {
    const gl = this.gl!,
      program = this.program!,
      corners = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      instances = new Float32Array(dabs.length * 6);
    for (let index = 0; index < dabs.length; index++) {
      const dab = dabs[index],
        at = index * 6,
        radius = dab.size / 2;
      instances.set(
        [
          dab.x,
          dab.y,
          radius,
          radius * Math.max(0.05, Math.min(1, dab.roundness)),
          dab.angle,
          Math.max(0, Math.min(1, dab.alpha)),
        ],
        at,
      );
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, bounds.width, bounds.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, corners, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, instances, gl.DYNAMIC_DRAW);
    const stride = 6 * Float32Array.BYTES_PER_ELEMENT;
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, 2 * 4);
    gl.vertexAttribDivisor(2, 1);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, 4 * 4);
    gl.vertexAttribDivisor(3, 1);
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 1, gl.FLOAT, false, stride, 5 * 4);
    gl.vertexAttribDivisor(4, 1);
    gl.uniform2f(
      gl.getUniformLocation(program, 'u_resolution'),
      bounds.width,
      bounds.height,
    );
    gl.uniform2f(
      gl.getUniformLocation(program, 'u_origin'),
      bounds.x,
      bounds.y,
    );
    const [red, green, blue] = parseHex(color);
    gl.uniform3f(gl.getUniformLocation(program, 'u_color'), red, green, blue);
    gl.uniform1f(
      gl.getUniformLocation(program, 'u_hardness'),
      Math.max(0, Math.min(1, hardness)),
    );
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, dabs.length);
    gl.flush();
  }

  render(
    dabs: BrushDab[],
    options: { color: string; hardness: number; maxTileSize?: number },
  ): RenderedBrushTile[] {
    const groups = partitionBrushDabs(dabs, options.maxTileSize),
      tiles: RenderedBrushTile[] = [];
    for (const group of groups) {
      const bounds = brushTileBounds(group);
      if (!bounds) continue;
      const poolKey = gpuTextureTargetKey(bounds.width, bounds.height),
        bytes = gpuTextureTargetCost(bounds.width, bounds.height),
        copy = this.tilePool.acquire(poolKey, bytes, () =>
          document.createElement('canvas'),
        );
      copy.width = bounds.width;
      copy.height = bounds.height;
      let gpuTarget: WebGlRenderTarget | null = null;
      if (this.backend === 'webgl2') {
        try {
          gpuTarget = this.gpuTargetPool!.acquire(poolKey, bytes, () =>
            this.createGpuTarget(bounds.width, bounds.height),
          );
          this.renderWebGl(
            group,
            bounds,
            options.color,
            Math.max(0, Math.min(1, options.hardness)),
            gpuTarget.framebuffer,
          );
          this.readGpuTarget(gpuTarget, bounds, group[0], copy);
          this.lastRenderPath = 'webgl2-pooled';
        } catch {
          if (gpuTarget) this.destroyGpuTarget(gpuTarget);
          gpuTarget = null;
          this.gpuTargetPool?.clear();
          this.renderCanvas2d(
            group,
            bounds,
            options.color,
            Math.max(0, Math.min(1, options.hardness)),
            copy,
          );
          this.lastRenderPath = 'canvas2d-texture-fallback';
        }
      } else {
        this.resize(bounds.width, bounds.height);
        this.renderCanvas2d(
          group,
          bounds,
          options.color,
          Math.max(0, Math.min(1, options.hardness)),
        );
        copy.getContext('2d')!.drawImage(this.canvas, 0, 0);
        this.lastRenderPath = 'canvas2d';
      }
      if (gpuTarget) this.gpuTargetPool!.release(poolKey, gpuTarget, bytes);
      let released = false;
      tiles.push({
        ...bounds,
        canvas: copy,
        release: () => {
          if (released) return;
          released = true;
          this.tilePool.release(poolKey, copy, bytes);
        },
      });
    }
    return tiles;
  }

  dispose() {
    this.tilePool.clear();
    this.gpuTargetPool?.clear();
    if (this.gl) {
      if (this.cornerBuffer) this.gl.deleteBuffer(this.cornerBuffer);
      if (this.instanceBuffer) this.gl.deleteBuffer(this.instanceBuffer);
      if (this.program) this.gl.deleteProgram(this.program);
      this.gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.canvas.width = this.canvas.height = 1;
  }
}
