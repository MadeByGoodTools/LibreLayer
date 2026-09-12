export type WorkingDepth = '8u' | '16u' | '16f' | '32f';
export type HighWorkingDepth = Exclude<WorkingDepth, '8u'>;

export type WorkingSurface = {
  version: 1;
  depth: HighWorkingDepth;
  width: number;
  height: number;
  data: Uint16Array | Float32Array;
};

export type StoredWorkingSurface = {
  version: 1;
  depth: HighWorkingDepth;
  width: number;
  height: number;
  encoding: 'base64-le';
  data: string;
};

export const WORKING_DEPTH_LABELS: Record<WorkingDepth, string> = {
  '8u': '8-bit integer',
  '16u': '16-bit integer',
  '16f': '16-bit floating point',
  '32f': '32-bit floating point',
};

export const normalizeWorkingDepth = (value: unknown): WorkingDepth =>
  value === '16u' || value === '16f' || value === '32f' ? value : '8u';

export const workingDepthBytesPerPixel = (depth: WorkingDepth) =>
  depth === '32f' ? 16 : depth === '8u' ? 4 : 8;

const validDimensions = (width: number, height: number) =>
  Number.isInteger(width) &&
  Number.isInteger(height) &&
  width > 0 &&
  height > 0 &&
  width <= 16384 &&
  height <= 16384 &&
  width * height <= 64_000_000;

const floatToHalf = (value: number) => {
  if (Number.isNaN(value)) return 0x7e00;
  if (value === Infinity) return 0x7c00;
  if (value === -Infinity) return 0xfc00;
  const float = new Float32Array([value]),
    bits = new Uint32Array(float.buffer)[0],
    sign = (bits >>> 16) & 0x8000,
    exponent = ((bits >>> 23) & 0xff) - 127 + 15,
    mantissa = bits & 0x7fffff;
  if (exponent <= 0) {
    if (exponent < -10) return sign;
    const shifted = (mantissa | 0x800000) >>> (1 - exponent),
      rounded = (shifted + 0x1000) >>> 13;
    return sign | rounded;
  }
  if (exponent >= 31) return sign | 0x7c00;
  const rounded = mantissa + 0x1000;
  if (rounded & 0x800000) {
    if (exponent + 1 >= 31) return sign | 0x7c00;
    return sign | ((exponent + 1) << 10);
  }
  return sign | (exponent << 10) | (rounded >>> 13);
};

const halfToFloat = (value: number) => {
  const sign = value & 0x8000 ? -1 : 1,
    exponent = (value >>> 10) & 0x1f,
    mantissa = value & 0x3ff;
  if (exponent === 0)
    return mantissa === 0
      ? sign < 0
        ? -0
        : 0
      : sign * 2 ** -14 * (mantissa / 1024);
  if (exponent === 31) return mantissa ? Number.NaN : sign * Infinity;
  return sign * 2 ** (exponent - 15) * (1 + mantissa / 1024);
};

const allocate = (depth: HighWorkingDepth, values: number) =>
  depth === '32f' ? new Float32Array(values) : new Uint16Array(values);

export const readWorkingChannel = (surface: WorkingSurface, index: number) => {
  if (index < 0 || index >= surface.data.length)
    throw Error('Channel is out of range.');
  const value = surface.data[index];
  if (surface.depth === '16u') return value / 65535;
  if (surface.depth === '16f') return halfToFloat(value);
  return value;
};

export const writeWorkingChannel = (
  surface: WorkingSurface,
  index: number,
  value: number,
) => {
  if (index < 0 || index >= surface.data.length)
    throw Error('Channel is out of range.');
  if (!Number.isFinite(value)) value = 0;
  if (surface.depth === '16u')
    surface.data[index] = Math.round(Math.max(0, Math.min(1, value)) * 65535);
  else if (surface.depth === '16f') surface.data[index] = floatToHalf(value);
  else surface.data[index] = value;
};

export const workingSurfaceFromRgba8 = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  depth: HighWorkingDepth,
): WorkingSurface => {
  if (!validDimensions(width, height) || pixels.length !== width * height * 4)
    throw Error('Working surface dimensions do not match its pixels.');
  const surface: WorkingSurface = {
    version: 1,
    depth,
    width,
    height,
    data: allocate(depth, pixels.length),
  };
  for (let index = 0; index < pixels.length; index++)
    writeWorkingChannel(surface, index, pixels[index] / 255);
  return surface;
};

export const workingSurfaceToRgba8 = (surface: WorkingSurface) => {
  assertWorkingSurface(surface);
  const output = new Uint8ClampedArray(surface.data.length);
  for (let index = 0; index < output.length; index++)
    output[index] = Math.round(
      Math.max(0, Math.min(1, readWorkingChannel(surface, index))) * 255,
    );
  return output;
};

export const syncWorkingSurfaceFromRgba8 = (
  surface: WorkingSurface,
  displayPixels: Uint8ClampedArray,
) => {
  assertWorkingSurface(surface);
  if (displayPixels.length !== surface.data.length)
    throw Error('Display proxy dimensions do not match the working surface.');
  let changedChannels = 0;
  for (let index = 0; index < displayPixels.length; index++) {
    const previous = Math.round(
      Math.max(0, Math.min(1, readWorkingChannel(surface, index))) * 255,
    );
    if (previous === displayPixels[index]) continue;
    writeWorkingChannel(surface, index, displayPixels[index] / 255);
    changedChannels++;
  }
  return changedChannels;
};

export const convertWorkingSurface = (
  source: WorkingSurface,
  depth: HighWorkingDepth,
) => {
  assertWorkingSurface(source);
  const output: WorkingSurface = {
    version: 1,
    depth,
    width: source.width,
    height: source.height,
    data: allocate(depth, source.data.length),
  };
  for (let index = 0; index < source.data.length; index++)
    writeWorkingChannel(output, index, readWorkingChannel(source, index));
  return output;
};

export const cloneWorkingSurface = (
  surface: WorkingSurface,
): WorkingSurface => {
  assertWorkingSurface(surface);
  return {
    ...surface,
    data:
      surface.depth === '32f'
        ? new Float32Array(surface.data)
        : new Uint16Array(surface.data),
  };
};

export const captureWorkingSurface = (
  surface: WorkingSurface,
  previous?: WorkingSurface,
) => {
  assertWorkingSurface(surface);
  if (
    previous &&
    previous.depth === surface.depth &&
    previous.width === surface.width &&
    previous.height === surface.height &&
    previous.data.byteLength === surface.data.byteLength
  ) {
    const currentBytes = new Uint8Array(
        surface.data.buffer,
        surface.data.byteOffset,
        surface.data.byteLength,
      ),
      previousBytes = new Uint8Array(
        previous.data.buffer,
        previous.data.byteOffset,
        previous.data.byteLength,
      );
    let equal = true;
    for (let index = 0; index < currentBytes.length; index++)
      if (currentBytes[index] !== previousBytes[index]) {
        equal = false;
        break;
      }
    if (equal) return previous;
  }
  return cloneWorkingSurface(surface);
};

export const assertWorkingSurface = (
  surface: WorkingSurface,
): WorkingSurface => {
  if (
    !surface ||
    surface.version !== 1 ||
    !['16u', '16f', '32f'].includes(surface.depth) ||
    !validDimensions(surface.width, surface.height) ||
    surface.data.length !== surface.width * surface.height * 4 ||
    (surface.depth === '32f'
      ? !(surface.data instanceof Float32Array)
      : !(surface.data instanceof Uint16Array))
  )
    throw Error('Invalid high-depth working surface.');
  return surface;
};

const bytesToBase64 = (bytes: Uint8Array) => {
  let output = '';
  for (let offset = 0; offset < bytes.length; offset += 32768)
    output += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return btoa(output);
};

const base64ToBytes = (value: string) => {
  if (!/^[a-z0-9+/]*={0,2}$/i.test(value))
    throw Error('Invalid base64 pixels.');
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
};

export const serializeWorkingSurface = (
  surface: WorkingSurface,
): StoredWorkingSurface => {
  assertWorkingSurface(surface);
  const bytesPerChannel = surface.depth === '32f' ? 4 : 2,
    bytes = new Uint8Array(surface.data.length * bytesPerChannel),
    view = new DataView(bytes.buffer);
  for (let index = 0; index < surface.data.length; index++) {
    if (surface.depth === '32f')
      view.setFloat32(index * 4, surface.data[index], true);
    else view.setUint16(index * 2, surface.data[index], true);
  }
  return {
    version: 1,
    depth: surface.depth,
    width: surface.width,
    height: surface.height,
    encoding: 'base64-le',
    data: bytesToBase64(bytes),
  };
};

export const deserializeWorkingSurface = (
  stored: StoredWorkingSurface,
): WorkingSurface => {
  if (
    !stored ||
    stored.version !== 1 ||
    !['16u', '16f', '32f'].includes(stored.depth) ||
    stored.encoding !== 'base64-le' ||
    typeof stored.data !== 'string' ||
    !validDimensions(stored.width, stored.height)
  )
    throw Error('Invalid stored high-depth surface.');
  const bytes = base64ToBytes(stored.data),
    values = stored.width * stored.height * 4,
    bytesPerChannel = stored.depth === '32f' ? 4 : 2;
  if (bytes.length !== values * bytesPerChannel)
    throw Error('Stored high-depth pixels have the wrong size.');
  const data = allocate(stored.depth, values),
    view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let index = 0; index < values; index++)
    data[index] =
      stored.depth === '32f'
        ? view.getFloat32(index * 4, true)
        : view.getUint16(index * 2, true);
  return assertWorkingSurface({
    version: 1,
    depth: stored.depth,
    width: stored.width,
    height: stored.height,
    data,
  });
};

export const workingSurfaceBytes = (surface: WorkingSurface) => {
  assertWorkingSurface(surface);
  return surface.data.byteLength;
};

export const resizeWorkingSurface = (
  source: WorkingSurface,
  width: number,
  height: number,
  method: 'nearest' | 'bilinear' = 'bilinear',
) => {
  assertWorkingSurface(source);
  if (!validDimensions(width, height))
    throw Error('Invalid resized dimensions.');
  const output: WorkingSurface = {
    version: 1,
    depth: source.depth,
    width,
    height,
    data: allocate(source.depth, width * height * 4),
  };
  for (let y = 0; y < height; y++) {
    const sourceY = ((y + 0.5) * source.height) / height - 0.5,
      y0 = Math.max(0, Math.min(source.height - 1, Math.floor(sourceY))),
      y1 = Math.max(0, Math.min(source.height - 1, y0 + 1)),
      fy = Math.max(0, Math.min(1, sourceY - y0));
    for (let x = 0; x < width; x++) {
      const sourceX = ((x + 0.5) * source.width) / width - 0.5,
        x0 = Math.max(0, Math.min(source.width - 1, Math.floor(sourceX))),
        x1 = Math.max(0, Math.min(source.width - 1, x0 + 1)),
        fx = Math.max(0, Math.min(1, sourceX - x0));
      for (let channel = 0; channel < 4; channel++) {
        let value: number;
        if (method === 'nearest') {
          const nearestX = Math.max(
              0,
              Math.min(source.width - 1, Math.round(sourceX)),
            ),
            nearestY = Math.max(
              0,
              Math.min(source.height - 1, Math.round(sourceY)),
            );
          value = readWorkingChannel(
            source,
            (nearestY * source.width + nearestX) * 4 + channel,
          );
        } else {
          const top =
              readWorkingChannel(
                source,
                (y0 * source.width + x0) * 4 + channel,
              ) *
                (1 - fx) +
              readWorkingChannel(
                source,
                (y0 * source.width + x1) * 4 + channel,
              ) *
                fx,
            bottom =
              readWorkingChannel(
                source,
                (y1 * source.width + x0) * 4 + channel,
              ) *
                (1 - fx) +
              readWorkingChannel(
                source,
                (y1 * source.width + x1) * 4 + channel,
              ) *
                fx;
          value = top * (1 - fy) + bottom * fy;
        }
        writeWorkingChannel(output, (y * width + x) * 4 + channel, value);
      }
    }
  }
  return output;
};

export const placeWorkingSurface = (
  source: WorkingSurface,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number,
) => {
  assertWorkingSurface(source);
  if (!validDimensions(width, height))
    throw Error('Invalid canvas dimensions.');
  const output: WorkingSurface = {
    version: 1,
    depth: source.depth,
    width,
    height,
    data: allocate(source.depth, width * height * 4),
  };
  offsetX = Math.round(offsetX);
  offsetY = Math.round(offsetY);
  for (let sourceY = 0; sourceY < source.height; sourceY++) {
    const targetY = sourceY + offsetY;
    if (targetY < 0 || targetY >= height) continue;
    for (let sourceX = 0; sourceX < source.width; sourceX++) {
      const targetX = sourceX + offsetX;
      if (targetX < 0 || targetX >= width) continue;
      for (let channel = 0; channel < 4; channel++)
        writeWorkingChannel(
          output,
          (targetY * width + targetX) * 4 + channel,
          readWorkingChannel(
            source,
            (sourceY * source.width + sourceX) * 4 + channel,
          ),
        );
    }
  }
  return output;
};
