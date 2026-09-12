import type { LocalDirectoryHandle } from './recovery';

export type ScratchLocation = 'browser' | 'save-folder';

type ScratchFile = { name: string; size: number; updated: number };
type WritableFileHandle = Awaited<ReturnType<LocalDirectoryHandle['getFileHandle']>>;
type ScratchDirectory = LocalDirectoryHandle & {
  values?: () => AsyncIterableIterator<WritableFileHandle>;
  removeEntry?: (name: string) => Promise<void>;
  getDirectoryHandle?: (
    name: string,
    options: { create: boolean },
  ) => Promise<ScratchDirectory>;
};

const prefix = '.librelayer-scratch-';

export const normalizeScratchQuota = (value: unknown) =>
  Math.max(128, Math.min(8192, Number.isFinite(Number(value)) ? Number(value) : 1024));

export const scratchFileName = (key: string) =>
  `${prefix}${key.replace(/[^a-z0-9_-]/gi, '-').slice(0, 96) || 'temporary'}.bin`;

export function selectScratchEvictions(
  files: ScratchFile[],
  incomingBytes: number,
  quotaBytes: number,
): ScratchFile[] {
  let used = files.reduce((sum, file) => sum + file.size, 0);
  const removed: ScratchFile[] = [];
  for (const file of [...files].sort((a, b) => a.updated - b.updated)) {
    if (used + incomingBytes <= quotaBytes) break;
    removed.push(file);
    used -= file.size;
  }
  return removed;
}

async function browserDirectory(): Promise<ScratchDirectory> {
  const root = (await navigator.storage.getDirectory()) as unknown as ScratchDirectory;
  if (!root.getDirectoryHandle) throw new Error('Browser scratch storage is unavailable.');
  return root.getDirectoryHandle('librelayer-scratch', { create: true });
}

async function directoryFiles(directory: ScratchDirectory): Promise<ScratchFile[]> {
  const files: ScratchFile[] = [];
  if (!directory.values) return files;
  for await (const handle of directory.values()) {
    if (!handle.name.startsWith(prefix)) continue;
    const file = await handle.getFile();
    files.push({ name: handle.name, size: file.size, updated: file.lastModified });
  }
  return files;
}

async function resolveDirectory(
  location: ScratchLocation,
  saveDirectory: LocalDirectoryHandle | null,
): Promise<ScratchDirectory> {
  if (location === 'browser') return browserDirectory();
  if (!saveDirectory) throw new Error('Choose a save folder before using it for scratch storage.');
  const permission = await saveDirectory.queryPermission({ mode: 'readwrite' });
  if (permission !== 'granted')
    throw new Error('Open Workspace settings and reselect the save folder to restore access.');
  return saveDirectory as ScratchDirectory;
}

export async function scratchUsage(
  location: ScratchLocation,
  saveDirectory: LocalDirectoryHandle | null = null,
) {
  const directory = await resolveDirectory(location, saveDirectory);
  const files = await directoryFiles(directory);
  return {
    bytes: files.reduce((sum, file) => sum + file.size, 0),
    files: files.length,
  };
}

export async function writeScratch(
  key: string,
  data: Blob,
  options: {
    location: ScratchLocation;
    quotaMb: number;
    saveDirectory?: LocalDirectoryHandle | null;
  },
) {
  const directory = await resolveDirectory(
    options.location,
    options.saveDirectory ?? null,
  );
  if (!directory.removeEntry)
    throw new Error('This browser cannot clean temporary files in the selected location.');
  const name = scratchFileName(key);
  const files = (await directoryFiles(directory)).filter((file) => file.name !== name);
  const quotaBytes = normalizeScratchQuota(options.quotaMb) * 1048576;
  if (data.size > quotaBytes) throw new Error('This operation is larger than the scratch quota.');
  for (const file of selectScratchEvictions(files, data.size, quotaBytes))
    await directory.removeEntry(file.name);
  const handle = await directory.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(data);
    await writable.close();
  } catch (error) {
    await writable.abort?.();
    throw error;
  }
  return name;
}

export async function deleteScratch(
  name: string,
  location: ScratchLocation,
  saveDirectory: LocalDirectoryHandle | null = null,
) {
  const directory = await resolveDirectory(location, saveDirectory);
  if (name.startsWith(prefix)) await directory.removeEntry?.(name);
}

export async function cleanScratch(
  location: ScratchLocation,
  saveDirectory: LocalDirectoryHandle | null = null,
) {
  const directory = await resolveDirectory(location, saveDirectory);
  const files = await directoryFiles(directory);
  if (!directory.removeEntry)
    throw new Error('This browser cannot clean temporary files in this location.');
  await Promise.all(files.map((file) => directory.removeEntry!(file.name)));
  return files.length;
}
