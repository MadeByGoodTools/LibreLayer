export type ProjectEnvelope<T> = {
  format: 'librelayer-package' | 'pixel-studio-package';
  version: 1;
  checksum: { algorithm: 'SHA-256'; value: string };
  payload: T;
};

type EncryptedProjectEnvelope = {
  format: 'librelayer-encrypted-package';
  version: 1;
  encryption: {
    algorithm: 'AES-GCM';
    kdf: 'PBKDF2-SHA-256';
    iterations: 310000;
    salt: string;
    iv: string;
  };
  ciphertext: string;
};

export class EncryptedProjectPasswordRequired extends Error {}
export class EncryptedProjectPasswordInvalid extends Error {}

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return btoa(binary);
};
const base64ToBytes = (value: string) => {
  if (!/^[a-z0-9+/]*={0,2}$/i.test(value)) throw Error('Invalid base64');
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
};
const deriveEncryptionKey = async (password: string, salt: Uint8Array) => {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: salt as Uint8Array<ArrayBuffer>,
      iterations: 310000,
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
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

export async function packEncryptedProject<T>(project: T, password: string) {
  if (password.length < 10)
    throw Error('Use a password with at least 10 characters.');
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12)),
    key = await deriveEncryptionKey(password, salt),
    plaintext = new TextEncoder().encode(JSON.stringify(project)),
    ciphertext = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as Uint8Array<ArrayBuffer> },
        key,
        plaintext,
      ),
    ),
    envelope: EncryptedProjectEnvelope = {
      format: 'librelayer-encrypted-package',
      version: 1,
      encryption: {
        algorithm: 'AES-GCM',
        kdf: 'PBKDF2-SHA-256',
        iterations: 310000,
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
      },
      ciphertext: bytesToBase64(ciphertext),
    };
  return new Blob([JSON.stringify(envelope)], {
    type: 'application/vnd.librelayer.encrypted-project+json',
  });
}

export async function unpackProject<T>(
  text: string,
  password?: string,
): Promise<{ project: T; verified: boolean; encrypted?: boolean }> {
  let parsed = JSON.parse(text) as
    | T
    | ProjectEnvelope<T>
    | EncryptedProjectEnvelope;
  if (
    parsed &&
    typeof parsed === 'object' &&
    'format' in parsed &&
    parsed.format === 'librelayer-encrypted-package'
  ) {
    if (!password) throw new EncryptedProjectPasswordRequired();
    if (
      parsed.version !== 1 ||
      parsed.encryption?.algorithm !== 'AES-GCM' ||
      parsed.encryption?.kdf !== 'PBKDF2-SHA-256' ||
      parsed.encryption?.iterations !== 310000 ||
      typeof parsed.encryption.salt !== 'string' ||
      typeof parsed.encryption.iv !== 'string' ||
      typeof parsed.ciphertext !== 'string'
    )
      throw new EncryptedProjectPasswordInvalid(
        'This encrypted LibreLayer project is invalid.',
      );
    try {
      const salt = base64ToBytes(parsed.encryption.salt),
        iv = base64ToBytes(parsed.encryption.iv),
        ciphertext = base64ToBytes(parsed.ciphertext);
      if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 17)
        throw Error('Invalid encryption values');
      const key = await deriveEncryptionKey(password, salt),
        plaintext = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv as Uint8Array<ArrayBuffer> },
          key,
          ciphertext as Uint8Array<ArrayBuffer>,
        );
      parsed = JSON.parse(new TextDecoder().decode(plaintext)) as T;
      return { project: parsed, verified: true, encrypted: true };
    } catch {
      throw new EncryptedProjectPasswordInvalid(
        'That password did not unlock this project.',
      );
    }
  }
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
