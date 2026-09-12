import type {
  LinkedFileHandleRecord,
  LocalFileHandle,
} from './recovery.ts';

export async function resolveLinkedFile(
  record: LinkedFileHandleRecord | null,
): Promise<{ file: File; handle: LocalFileHandle; name: string }> {
  if (!record) throw Error('The original linked file is unavailable');
  let permission = await record.handle.queryPermission?.({ mode: 'read' });
  if (permission === 'prompt')
    permission = await record.handle.requestPermission?.({ mode: 'read' });
  if (permission !== 'granted')
    throw Error('Permission to the linked file was not granted');
  return {
    file: await record.handle.getFile(),
    handle: record.handle,
    name: record.name,
  };
}
