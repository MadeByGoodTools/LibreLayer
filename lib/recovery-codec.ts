export type RecoveryAsset = {
  id: string;
  mime: string;
  bytes: Blob;
  updated: number;
};

const assetPrefix = 'librelayer-asset:';

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const binary = atob(value),
    bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++)
    bytes[index] = binary.charCodeAt(index);
  return bytes;
};

const hex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');

export const isRecoveryAssetReference = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith(assetPrefix);

export async function packRecoveryJson(json: string): Promise<{
  manifest: string;
  assets: RecoveryAsset[];
}> {
  const root = JSON.parse(json) as unknown,
    assets = new Map<string, RecoveryAsset>();
  const visit = async (value: unknown): Promise<unknown> => {
    if (typeof value === 'string') {
      const match = /^data:(image\/[^;,]+);base64,([\s\S]+)$/.exec(value);
      if (!match) return value;
      const bytes = base64ToBytes(match[2]),
        id = hex(await crypto.subtle.digest('SHA-256', bytes));
      if (!assets.has(id))
        assets.set(id, {
          id,
          mime: match[1],
          bytes: new Blob([bytes], { type: match[1] }),
          updated: Date.now(),
        });
      return `${assetPrefix}${id}`;
    }
    if (Array.isArray(value)) return Promise.all(value.map(visit));
    if (value && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(value)) result[key] = await visit(child);
      return result;
    }
    return value;
  };
  return { manifest: JSON.stringify(await visit(root)), assets: [...assets.values()] };
}

export async function hydrateRecoveryJson(
  manifest: string,
  assets: Map<string, RecoveryAsset>,
): Promise<string> {
  const root = JSON.parse(manifest) as unknown;
  const visit = async (value: unknown): Promise<unknown> => {
    if (isRecoveryAssetReference(value)) {
      const asset = assets.get(value.slice(assetPrefix.length));
      if (!asset) throw new Error('A recovery pixel asset is missing.');
      return `data:${asset.mime};base64,${bytesToBase64(new Uint8Array(await asset.bytes.arrayBuffer()))}`;
    }
    if (Array.isArray(value)) return Promise.all(value.map(visit));
    if (value && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(value)) result[key] = await visit(child);
      return result;
    }
    return value;
  };
  return JSON.stringify(await visit(root));
}

export async function compressRecoveryManifest(manifest: string): Promise<{
  data: string | Blob;
  encoding: 'plain' | 'gzip';
}> {
  if (manifest.length < 65536 || typeof CompressionStream === 'undefined')
    return { data: manifest, encoding: 'plain' };
  const stream = new Blob([manifest]).stream().pipeThrough(new CompressionStream('gzip'));
  return { data: await new Response(stream).blob(), encoding: 'gzip' };
}

export async function decompressRecoveryManifest(
  data: string | Blob,
  encoding: 'plain' | 'gzip',
) {
  if (encoding === 'plain') return typeof data === 'string' ? data : data.text();
  if (!(data instanceof Blob) || typeof DecompressionStream === 'undefined')
    throw new Error('Compressed recovery is unsupported in this browser.');
  return new Response(data.stream().pipeThrough(new DecompressionStream('gzip'))).text();
}

export function referencedRecoveryAssets(manifest: string) {
  return [...manifest.matchAll(/librelayer-asset:([a-f0-9]{64})/g)].map(
    (match) => match[1],
  );
}
