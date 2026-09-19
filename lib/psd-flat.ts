import {
  workingSurfaceToFloat32,
  type WorkingSurface,
} from './working-depth.ts';

const signature = (value: string) => new TextEncoder().encode(value);
const even = (value: number) => value + (value % 2);
const four = (value: number) => value + ((4 - (value % 4)) % 4);

const writeLength = (
  view: DataView,
  offset: number,
  value: number,
  psb: boolean,
) => {
  if (psb) {
    view.setUint32(offset, Math.floor(value / 0x1_0000_0000), false);
    view.setUint32(offset + 4, value >>> 0, false);
    return offset + 8;
  }
  view.setUint32(offset, value, false);
  return offset + 4;
};

/**
 * Write a one-layer RGB PSD/PSB with true 16-bit integer or 32-bit float
 * samples. The negative layer count marks the fourth composite channel as
 * transparency; subsequent composite planes remain independent alpha channels.
 */
export function encodeFlatHighDepthPsd(
  surface: WorkingSurface,
  psb = false,
  additionalChannels: ImageData[] = [],
) {
  const depth = surface.depth === '32f' ? 32 : 16,
    bytesPerSample = depth / 8,
    pixelCount = surface.width * surface.height,
    compositeChannels = 4 + additionalChannels.length,
    lengthBytes = psb ? 8 : 4,
    nameBytes = signature('Flattened artwork'),
    pascalNameBytes = four(1 + nameBytes.length),
    extraLength = 4 + 4 + pascalNameBytes,
    layerRecordLength = 16 + 2 + 4 * (2 + lengthBytes) + 12 + 4 + extraLength,
    layerChannelLength = 2 + pixelCount * bytesPerSample,
    layerInfoLength = even(2 + layerRecordLength + 4 * layerChannelLength),
    layerAndMaskLength = lengthBytes + layerInfoLength + 4,
    headerLength = 26 + 4 + 4 + lengthBytes + layerAndMaskLength + 2,
    output = new Uint8Array(
      headerLength + compositeChannels * pixelCount * bytesPerSample,
    ),
    view = new DataView(output.buffer),
    pixels = workingSurfaceToFloat32(surface);
  if (compositeChannels > 16)
    throw Error('PSD files support at most 16 composite channels.');
  for (const channel of additionalChannels)
    if (channel.width !== surface.width || channel.height !== surface.height)
      throw Error('PSD alpha channel dimensions do not match the document.');

  output.set(signature('8BPS'));
  view.setUint16(4, psb ? 2 : 1, false);
  view.setUint16(12, compositeChannels, false);
  view.setUint32(14, surface.height, false);
  view.setUint32(18, surface.width, false);
  view.setUint16(22, depth, false);
  view.setUint16(24, 3, false);
  let offset = 26;
  view.setUint32(offset, 0, false);
  offset += 4;
  view.setUint32(offset, 0, false);
  offset += 4;
  offset = writeLength(view, offset, layerAndMaskLength, psb);
  offset = writeLength(view, offset, layerInfoLength, psb);
  view.setInt16(offset, -1, false);
  offset += 2;

  view.setInt32(offset, 0, false);
  view.setInt32(offset + 4, 0, false);
  view.setInt32(offset + 8, surface.height, false);
  view.setInt32(offset + 12, surface.width, false);
  offset += 16;
  view.setUint16(offset, 4, false);
  offset += 2;
  for (const channelId of [0, 1, 2, -1]) {
    view.setInt16(offset, channelId, false);
    offset += 2;
    offset = writeLength(view, offset, layerChannelLength, psb);
  }
  output.set(signature('8BIM'), offset);
  output.set(signature('norm'), offset + 4);
  output[offset + 8] = 255;
  offset += 12;
  view.setUint32(offset, extraLength, false);
  offset += 4;
  view.setUint32(offset, 0, false);
  offset += 4;
  view.setUint32(offset, 0, false);
  offset += 4;
  output[offset] = nameBytes.length;
  output.set(nameBytes, offset + 1);
  offset += pascalNameBytes;

  const writeSample = (value: number) => {
    if (depth === 16) {
      view.setUint16(
        offset,
        Math.round(Math.max(0, Math.min(1, value)) * 65535),
        false,
      );
      offset += 2;
    } else {
      view.setFloat32(offset, value, false);
      offset += 4;
    }
  };
  const writeWorkingPlane = (component: number) => {
    view.setUint16(offset, 0, false);
    offset += 2;
    for (let pixel = 0; pixel < pixelCount; pixel++)
      writeSample(pixels[pixel * 4 + component]);
  };
  for (const component of [0, 1, 2, 3]) writeWorkingPlane(component);
  if (offset % 2) offset++;
  view.setUint32(offset, 0, false);
  offset += 4;
  view.setUint16(offset, 0, false);
  offset += 2;

  for (const component of [0, 1, 2, 3])
    for (let pixel = 0; pixel < pixelCount; pixel++)
      writeSample(pixels[pixel * 4 + component]);
  for (const channel of additionalChannels)
    for (let pixel = 0; pixel < pixelCount; pixel++) {
      writeSample(channel.data[pixel * 4] / 255);
    }
  if (offset !== output.length)
    throw Error('High-depth PSD length accounting failed.');
  return output.buffer;
}
