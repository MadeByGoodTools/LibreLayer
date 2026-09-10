export type RecoveryRecord = {
  id: string;
  name: string;
  updated: number;
  json: string;
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

export type RecentFileRecord = {
  id: string;
  name: string;
  updated: number;
  handle: LocalFileHandle;
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
      createWritable: () => Promise<{
        write: (data: Blob) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }
  >;
};

const databaseName = 'pixel-studio-recovery';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 3);
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
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
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
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readonly'),
      request = tx.objectStore('documents').getAll();
    tx.oncomplete = () => {
      db.close();
      resolve(
        (request.result as RecoveryRecord[]).sort(
          (a, b) => b.updated - a.updated,
        ),
      );
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export const saveRecovery = (record: RecoveryRecord) =>
  writeOne('documents', record);

export async function versionRecords(
  documentId?: string,
): Promise<VersionRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('versions', 'readonly');
    const store = tx.objectStore('versions');
    const request = documentId
      ? store.index('documentId').getAll(documentId)
      : store.getAll();
    tx.oncomplete = () => {
      db.close();
      resolve(
        (request.result as VersionRecord[]).sort(
          (a, b) => b.updated - a.updated,
        ),
      );
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function saveVersion(
  record: VersionRecord,
  keep = 12,
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('versions', 'readwrite'),
      store = tx.objectStore('versions'),
      request = store.index('documentId').getAll(record.documentId);
    request.onsuccess = () => {
      store.put(record);
      const old = (request.result as VersionRecord[])
        .filter((item) => item.id !== record.id)
        .sort((a, b) => b.updated - a.updated)
        .slice(Math.max(0, keep - 1));
      old.forEach((item) => store.delete(item.id));
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
}

export async function deleteVersion(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
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
  return new Promise((resolve, reject) => {
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
