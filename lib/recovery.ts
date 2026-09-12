import {
  compressRecoveryManifest,
  decompressRecoveryManifest,
  hydrateRecoveryJson,
  packRecoveryJson,
  type RecoveryAsset,
} from './recovery-codec.ts';

export type RecoveryRecord = {
  id: string;
  name: string;
  updated: number;
  json: string;
};

export type StoredRecoveryRecord = Omit<RecoveryRecord, 'json'> & {
  json?: string;
  manifest?: string | Blob;
  encoding?: 'plain' | 'gzip';
  assetIds?: string[];
};

type StoredVersionRecord = StoredRecoveryRecord & {
  documentId: string;
  reason: VersionRecord['reason'];
};

export type RecoveryIssue = {
  id: string;
  name: string;
  updated: number;
  message: string;
  repairVersionUpdated?: number;
};

export type RecoveryAudit = {
  records: RecoveryRecord[];
  issues: RecoveryIssue[];
};

type RecoveryTransaction = {
  id: string;
  targetId: string;
  kind: 'document' | 'version';
  started: number;
};

export type WorkspaceRecord = {
  id: 'current';
  documentIds: string[];
  activeId: string;
  updated: number;
};

export type VersionRecord = RecoveryRecord & {
  documentId: string;
  reason: 'autosave' | 'manual';
};

export type LocalFileHandle = {
  name: string;
  getFile: () => Promise<File>;
  queryPermission?: (options: { mode: 'read' }) => Promise<PermissionState>;
  requestPermission?: (options: { mode: 'read' }) => Promise<PermissionState>;
};

export type LinkedFileHandleRecord = {
  id: string;
  name: string;
  updated: number;
  handle: LocalFileHandle;
};

export type RecentFileRecord = {
  id: string;
  name: string;
  updated: number;
  handle: LocalFileHandle;
};

export type RawAssetRecord = {
  id: string;
  name: string;
  type: string;
  lastModified: number;
  blob: Blob;
  updated: number;
};

export type BrushTipRecord = {
  id: string;
  name: string;
  folder: string;
  tags: string[];
  favorite: boolean;
  source: 'image' | 'abr';
  width: number;
  height: number;
  blob: Blob;
  updated: number;
  settings?: {
    size?: number;
    angle?: number;
    roundness?: number;
    spacing?: number;
    sizeJitter?: number;
    opacityJitter?: number;
    flowJitter?: number;
    scatter?: number;
  };
};

export type LocalDirectoryHandle = {
  name: string;
  queryPermission: (options: { mode: 'readwrite' }) => Promise<PermissionState>;
  requestPermission: (options: {
    mode: 'readwrite';
  }) => Promise<PermissionState>;
  getFileHandle: (
    name: string,
    options: { create: boolean },
  ) => Promise<
    LocalFileHandle & {
      createWritable: (options?: { keepExistingData?: boolean }) => Promise<{
        write: (data: Blob) => Promise<void>;
        close: () => Promise<void>;
        abort?: () => Promise<void>;
      }>;
    }
  >;
  removeEntry?: (name: string) => Promise<void>;
};

const databaseName = 'pixel-studio-recovery';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 6);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('documents'))
        request.result.createObjectStore('documents', { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains('workspace'))
        request.result.createObjectStore('workspace', { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains('handles'))
        request.result.createObjectStore('handles', { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains('versions')) {
        const versions = request.result.createObjectStore('versions', {
          keyPath: 'id',
        });
        versions.createIndex('documentId', 'documentId');
      }
      if (!request.result.objectStoreNames.contains('recent'))
        request.result.createObjectStore('recent', { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains('raw-assets'))
        request.result.createObjectStore('raw-assets', { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains('brush-tips'))
        request.result.createObjectStore('brush-tips', { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains('recovery-assets'))
        request.result.createObjectStore('recovery-assets', { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains('transactions'))
        request.result.createObjectStore('transactions', { keyPath: 'id' });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function brushTipRecords(): Promise<BrushTipRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('brush-tips', 'readonly'),
      request = tx.objectStore('brush-tips').getAll();
    tx.oncomplete = () => {
      db.close();
      resolve(
        (request.result as BrushTipRecord[]).sort(
          (a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name),
        ),
      );
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export const saveBrushTip = (record: BrushTipRecord) =>
  writeOne('brush-tips', record);

export async function deleteBrushTip(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('brush-tips', 'readwrite');
    tx.objectStore('brush-tips').delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Brush tip deletion failed'));
    };
  });
}

async function readOne<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly'),
      request = tx.objectStore(storeName).get(key);
    tx.oncomplete = () => {
      db.close();
      resolve((request.result as T | undefined) ?? null);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function writeOne(storeName: string, value: unknown): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function recoveryRecords(): Promise<RecoveryRecord[]> {
  const records = await readStoredRecords('documents');
  return hydrateStoredRecords(records);
}

async function readStoredRecords(
  storeName: 'documents' | 'versions',
): Promise<StoredRecoveryRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly'),
      request = tx.objectStore(storeName).getAll();
    tx.oncomplete = () => {
      db.close();
      resolve(request.result as StoredRecoveryRecord[]);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export const saveRecovery = (record: RecoveryRecord) =>
  savePackedRecord('documents', 'document', record);

export async function versionRecords(
  documentId?: string,
): Promise<VersionRecord[]> {
  const db = await openDatabase();
  const records = await new Promise<StoredRecoveryRecord[]>((resolve, reject) => {
    const tx = db.transaction('versions', 'readonly');
    const store = tx.objectStore('versions');
    const request = documentId
      ? store.index('documentId').getAll(documentId)
      : store.getAll();
    tx.oncomplete = () => {
      db.close();
      resolve(request.result as StoredRecoveryRecord[]);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
  return (await hydrateStoredRecords(records)) as VersionRecord[];
}

export async function saveVersion(
  record: VersionRecord,
  keep = 12,
): Promise<void> {
  const transaction = await beginRecoveryTransaction('version', record.id);
  const { stored, assets } = await prepareStoredRecord(record);
  const db = await openDatabase();
  let removedVersions = 0;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(
        ['versions', 'recovery-assets', 'transactions'],
        'readwrite',
      ),
      store = tx.objectStore('versions'),
      request = store.index('documentId').getAll(record.documentId);
    request.onsuccess = () => {
      assets.forEach((asset) => tx.objectStore('recovery-assets').put(asset));
      store.put(stored);
      const old = (request.result as VersionRecord[])
        .filter((item) => item.id !== record.id)
        .sort((a, b) => b.updated - a.updated)
        .slice(Math.max(0, keep - 1));
      removedVersions = old.length;
      old.forEach((item) => store.delete(item.id));
      tx.objectStore('transactions').delete(transaction.id);
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Version history update failed'));
    };
  });
  if (removedVersions) await compactRecoveryAssets();
}

async function beginRecoveryTransaction(
  kind: RecoveryTransaction['kind'],
  targetId: string,
) {
  const transaction: RecoveryTransaction = {
    id: crypto.randomUUID(),
    targetId,
    kind,
    started: Date.now(),
  };
  await writeOne('transactions', transaction);
  return transaction;
}

async function prepareStoredRecord(record: RecoveryRecord) {
  const packed = await packRecoveryJson(record.json),
    compressed = await compressRecoveryManifest(packed.manifest),
    { json: _json, ...metadata } = record;
  return {
    assets: packed.assets,
    stored: {
      ...metadata,
      manifest: compressed.data,
      encoding: compressed.encoding,
      assetIds: packed.assets.map((asset) => asset.id),
    } satisfies StoredRecoveryRecord,
  };
}

async function savePackedRecord(
  storeName: 'documents',
  kind: RecoveryTransaction['kind'],
  record: RecoveryRecord,
) {
  const transaction = await beginRecoveryTransaction(kind, record.id);
  const { stored, assets } = await prepareStoredRecord(record),
    db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(
      [storeName, 'recovery-assets', 'transactions'],
      'readwrite',
    );
    assets.forEach((asset) => tx.objectStore('recovery-assets').put(asset));
    tx.objectStore(storeName).put(stored);
    tx.objectStore('transactions').delete(transaction.id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Recovery transaction failed'));
    };
  });
}

async function recoveryAssetsByIds(ids: string[]) {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map<string, RecoveryAsset>();
  const db = await openDatabase();
  return new Promise<Map<string, RecoveryAsset>>((resolve, reject) => {
    const tx = db.transaction('recovery-assets', 'readonly'),
      store = tx.objectStore('recovery-assets'),
      requests = unique.map((id) => store.get(id));
    tx.oncomplete = () => {
      db.close();
      const assets = requests
        .map((request) => request.result as RecoveryAsset | undefined)
        .filter((asset): asset is RecoveryAsset => Boolean(asset));
      resolve(new Map(assets.map((asset) => [asset.id, asset])));
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function hydrateStoredRecords(records: StoredRecoveryRecord[]) {
  const assetMap = await recoveryAssetsByIds(
    records.flatMap((record) => record.assetIds ?? []),
  );
  return Promise.all(
    records
      .sort((a, b) => b.updated - a.updated)
      .map((record) => hydrateStoredRecord(record, assetMap)),
  );
}

async function hydrateStoredRecord(
  record: StoredRecoveryRecord,
  assetMap: Map<string, RecoveryAsset>,
) {
  const { manifest, encoding, assetIds: _assetIds, ...metadata } = record;
  if (!manifest) {
    if (typeof metadata.json !== 'string')
      throw new Error('A recovery record has no document data.');
    return metadata as RecoveryRecord;
  }
  const compact = await decompressRecoveryManifest(
    manifest,
    encoding ?? 'plain',
  );
  return {
    ...metadata,
    json: await hydrateRecoveryJson(compact, assetMap),
  } as RecoveryRecord;
}

export async function newestReadableRecovery(
  records: StoredRecoveryRecord[],
  assets: Map<string, RecoveryAsset>,
) {
  for (const record of [...records].sort((a, b) => b.updated - a.updated)) {
    try {
      return await hydrateStoredRecord(record, assets);
    } catch {
      // A corrupt newer candidate must not prevent an older intact recovery.
    }
  }
  return null;
}

export async function auditRecoveryStorage(): Promise<RecoveryAudit> {
  const documents = await readStoredRecords('documents'),
    versions = (await readStoredRecords('versions')) as StoredVersionRecord[],
    all = [...documents, ...versions],
    assets = await recoveryAssetsByIds(all.flatMap((record) => record.assetIds ?? [])),
    healthyVersions = new Map<string, VersionRecord[]>(),
    records: RecoveryRecord[] = [],
    issues: RecoveryIssue[] = [];
  for (const stored of versions.sort((a, b) => b.updated - a.updated)) {
    try {
      const version = (await hydrateStoredRecord(stored, assets)) as VersionRecord,
        list = healthyVersions.get(stored.documentId) ?? [];
      list.push(version);
      healthyVersions.set(stored.documentId, list);
    } catch {
      // Damaged versions are ignored as repair sources and never overwrite data.
    }
  }
  for (const stored of documents.sort((a, b) => b.updated - a.updated)) {
    try {
      records.push(await hydrateStoredRecord(stored, assets));
    } catch (error) {
      issues.push({
        id: stored.id,
        name: stored.name,
        updated: stored.updated,
        message:
          error instanceof Error ? error.message : 'Recovery data is damaged.',
        repairVersionUpdated: healthyVersions.get(stored.id)?.[0]?.updated,
      });
    }
  }
  return { records, issues };
}

export async function repairRecoveryFromVersion(
  documentId: string,
): Promise<RecoveryRecord> {
  const versions = (await readStoredRecords('versions')) as StoredVersionRecord[],
    candidates = versions
      .filter((record) => record.documentId === documentId)
      .sort((a, b) => b.updated - a.updated),
    assets = await recoveryAssetsByIds(
      candidates.flatMap((record) => record.assetIds ?? []),
    );
  const version = (await newestReadableRecovery(
    candidates,
    assets,
  )) as VersionRecord | null;
  if (!version)
    throw new Error('No intact version is available for this recovery copy.');
  const repaired: RecoveryRecord = {
    id: documentId,
    name: version.name,
    updated: Date.now(),
    json: version.json,
  };
  await saveRecovery(repaired);
  return repaired;
}

export async function compactRecoveryAssets() {
  const db = await openDatabase();
  const snapshot = await new Promise<{
    documents: StoredRecoveryRecord[];
    versions: StoredRecoveryRecord[];
    assets: RecoveryAsset[];
  }>((resolve, reject) => {
    const tx = db.transaction(
        ['documents', 'versions', 'recovery-assets'],
        'readonly',
      ),
      documents = tx.objectStore('documents').getAll(),
      versions = tx.objectStore('versions').getAll(),
      assets = tx.objectStore('recovery-assets').getAll();
    tx.oncomplete = () => {
      db.close();
      resolve({
        documents: documents.result as StoredRecoveryRecord[],
        versions: versions.result as StoredRecoveryRecord[],
        assets: assets.result as RecoveryAsset[],
      });
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
  const referenced = new Set(
      [...snapshot.documents, ...snapshot.versions].flatMap(
        (record) => record.assetIds ?? [],
      ),
    ),
    unused = snapshot.assets.filter((asset) => !referenced.has(asset.id));
  if (!unused.length) return 0;
  const writeDb = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = writeDb.transaction('recovery-assets', 'readwrite'),
      store = tx.objectStore('recovery-assets');
    unused.forEach((asset) => store.delete(asset.id));
    tx.oncomplete = () => {
      writeDb.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      writeDb.close();
      reject(tx.error ?? new Error('Recovery assets could not be compacted'));
    };
  });
  return unused.length;
}

export async function recoverInterruptedRecoveryTransactions() {
  const db = await openDatabase();
  const count = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction('transactions', 'readwrite'),
      store = tx.objectStore('transactions'),
      request = store.getAll();
    request.onsuccess = () => store.clear();
    tx.oncomplete = () => {
      db.close();
      resolve((request.result as RecoveryTransaction[]).length);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Recovery journal could not be checked'));
    };
  });
  await compactRecoveryAssets();
  return count;
}

export async function deleteVersion(id: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('versions', 'readwrite');
    tx.objectStore('versions').delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Version history update failed'));
    };
  });
  await compactRecoveryAssets();
}

export async function recentFiles(): Promise<RecentFileRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('recent', 'readonly'),
      request = tx.objectStore('recent').getAll();
    tx.oncomplete = () => {
      db.close();
      resolve(
        (request.result as RecentFileRecord[])
          .sort((a, b) => b.updated - a.updated)
          .slice(0, 10),
      );
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function rememberRecentFile(
  handle: LocalFileHandle,
): Promise<void> {
  const current = await recentFiles();
  const id = `${handle.name.toLowerCase()}:${Date.now()}`;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('recent', 'readwrite'),
      store = tx.objectStore('recent');
    current
      .filter((item) => item.name.toLowerCase() === handle.name.toLowerCase())
      .forEach((item) => store.delete(item.id));
    store.put({ id, name: handle.name, updated: Date.now(), handle });
    current.slice(9).forEach((item) => store.delete(item.id));
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Recent file update failed'));
    };
  });
}

export async function forgetRecentFile(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('recent', 'readwrite');
    tx.objectStore('recent').delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Recent file update failed'));
    };
  });
}

export async function deleteRecovery(id: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    tx.objectStore('documents').delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Recovery change failed'));
    };
  });
  await compactRecoveryAssets();
}

export const loadWorkspaceState = () =>
  readOne<WorkspaceRecord>('workspace', 'current');

export const saveWorkspaceState = (
  state: Omit<WorkspaceRecord, 'id' | 'updated'>,
) =>
  writeOne('workspace', {
    id: 'current',
    ...state,
    updated: Date.now(),
  } satisfies WorkspaceRecord);

export async function getDefaultSaveDirectory(): Promise<LocalDirectoryHandle | null> {
  const value = await readOne<{ id: string; handle: LocalDirectoryHandle }>(
    'handles',
    'default-save-directory',
  );
  return value?.handle ?? null;
}

export const setDefaultSaveDirectory = (handle: LocalDirectoryHandle) =>
  writeOne('handles', { id: 'default-save-directory', handle });

export const saveLinkedFileHandle = (id: string, handle: LocalFileHandle) =>
  writeOne('handles', {
    id: `linked:${id}`,
    name: handle.name,
    updated: Date.now(),
    handle,
  } satisfies LinkedFileHandleRecord);

export const getLinkedFileHandle = (id: string) =>
  readOne<LinkedFileHandleRecord>('handles', `linked:${id}`);

export async function clearDefaultSaveDirectory(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').delete('default-save-directory');
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export const saveRawAsset = (id: string, file: File) =>
  writeOne('raw-assets', {
    id,
    name: file.name,
    type: file.type,
    lastModified: file.lastModified,
    blob: file,
    updated: Date.now(),
  } satisfies RawAssetRecord);

export async function loadRawAsset(id: string): Promise<File | null> {
  const record = await readOne<RawAssetRecord>('raw-assets', id);
  return record
    ? new File([record.blob], record.name, {
        type: record.type,
        lastModified: record.lastModified,
      })
    : null;
}
