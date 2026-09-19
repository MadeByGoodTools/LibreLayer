import type { PixelData } from 'ag-psd';

const sectionLength = (view: DataView, offset: number, psb: boolean) => {
  if (!psb) return { value: view.getUint32(offset, false), next: offset + 4 };
  const high = view.getUint32(offset, false),
    low = view.getUint32(offset + 4, false),
    value = high * 0x1_0000_0000 + low;
  if (!Number.isSafeInteger(value)) throw Error('PSD section is too large.');
  return { value, next: offset + 8 };
};

/** Read the signed layer count that marks a merged transparency channel. */
export function psdHasMergedTransparency(buffer: ArrayBuffer, psb: boolean) {
  const view = new DataView(buffer);
  if (buffer.byteLength < 40) return false;
  const colorLength = view.getUint32(26, false);
  let offset = 30 + colorLength;
  if (offset + 4 > buffer.byteLength) return false;
  const resourceLength = view.getUint32(offset, false);
  offset += 4 + resourceLength;
  if (offset + (psb ? 18 : 10) > buffer.byteLength) return false;
  const layerAndMask = sectionLength(view, offset, psb);
  if (!layerAndMask.value) return false;
  const layerInfo = sectionLength(view, layerAndMask.next, psb);
  if (layerInfo.value < 2 || layerInfo.next + 2 > buffer.byteLength)
    return false;
  return view.getInt16(layerInfo.next, false) < 0;
}

/** Repair ag-psd's lazy composite decode while leaving saved channels separate. */
export function restoreLazyCompositeAlpha(
  composite: PixelData | undefined,
  extra: PixelData[] | undefined,
  mergedTransparency: boolean,
) {
  if (!mergedTransparency || !composite || !extra?.length) return extra;
  const alpha = extra[0];
  if (
    alpha.width !== composite.width ||
    alpha.height !== composite.height ||
    alpha.data.constructor !== composite.data.constructor
  )
    throw Error(
      'PSD merged transparency channel does not match its composite.',
    );
  for (let pixel = 0; pixel < composite.width * composite.height; pixel++)
    composite.data[pixel * 4 + 3] = alpha.data[pixel];
  return extra.slice(1);
}
