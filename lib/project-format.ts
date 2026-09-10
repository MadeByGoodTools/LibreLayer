export type ProjectEnvelope<T> = {
  format: 'librelayer-package' | 'pixel-studio-package';
  version: 1;
  checksum: { algorithm: 'SHA-256'; value: string };
  payload: T;
};

const digestText = async (text: string) => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

export async function packProject<T>(project: T): Promise<Blob> {
  const payloadText = JSON.stringify(project);
  const envelope: ProjectEnvelope<T> = {
    format: 'librelayer-package',
    version: 1,
    checksum: {
      algorithm: 'SHA-256',
      value: await digestText(payloadText),
    },
    payload: project,
  };
  return new Blob([JSON.stringify(envelope)], {
    type: 'application/vnd.librelayer.project+json',
  });
}

export async function unpackProject<T>(
  text: string,
): Promise<{ project: T; verified: boolean }> {
  const parsed = JSON.parse(text) as T | ProjectEnvelope<T>;
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('format' in parsed) ||
    !['librelayer-package', 'pixel-studio-package'].includes(parsed.format)
  )
    return { project: parsed as T, verified: false };
  if (
    parsed.version !== 1 ||
    parsed.checksum?.algorithm !== 'SHA-256' ||
    !/^[0-9a-f]{64}$/.test(parsed.checksum.value) ||
    !parsed.payload
  )
    throw Error('This LibreLayer package header is invalid.');
  const actual = await digestText(JSON.stringify(parsed.payload));
  if (actual !== parsed.checksum.value)
    throw Error(
      'This project did not pass its integrity check. Open a recovery version instead.',
    );
  return { project: parsed.payload, verified: true };
}
