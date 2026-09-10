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

export type LocalDirectoryHandle = {
  name: string;
  queryPermission: (options: { mode: 'readwrite' }) => Promise<PermissionState>;
  requestPermission: (options: {
    mode: 'readwrite';
  }) => Promise<PermissionState>;
  getFileHandle: (
    name: string,
    options: { create: boolean },
  ) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

const databaseName = 'pixel-studio-recovery';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('documents'))
        request.result.createObjectStore('documents', { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains('workspace'))
        request.result.createObjectStore('workspace', { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains('handles'))
        request.result.createObjectStore('handles', { keyPath: 'id' });
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
