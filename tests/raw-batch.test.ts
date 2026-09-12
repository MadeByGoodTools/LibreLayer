import assert from 'node:assert/strict';
import test from 'node:test';
import { runRawBatch } from '../lib/raw-batch.ts';

void test('RAW batches process each item sequentially and retain failures', async () => {
  const writes: string[] = [],
    states: string[] = [];
  const result = await runRawBatch(
    [
      { name: 'one.raw', source: 1 },
      { name: 'bad.raw', source: 2 },
      { name: 'three.raw', source: 3 },
    ],
    {
      shouldCancel: () => false,
      decode: async (source) => {
        if (source === 2) throw Error('Unreadable sensor data');
        return source * 10;
      },
      render: (image) => image + 1,
      write: (output, name) => {
        writes.push(`${name}:${output}`);
      },
      onProgress: (progress) => states.push(`${progress.name}:${progress.state}`),
    },
  );
  assert.deepEqual(writes, ['one.raw:11', 'three.raw:31']);
  assert.deepEqual(result, {
    completed: 2,
    cancelled: false,
    failures: [{ name: 'bad.raw', error: 'Unreadable sensor data' }],
  });
  assert.ok(states.includes('bad.raw:failed'));
});

void test('RAW batches stop cleanly before the next source', async () => {
  let cancel = false;
  const result = await runRawBatch(
    [
      { name: 'one.raw', source: 1 },
      { name: 'two.raw', source: 2 },
    ],
    {
      shouldCancel: () => cancel,
      decode: async (source) => source,
      render: (image) => image,
      write: () => {
        cancel = true;
      },
    },
  );
  assert.deepEqual(result, { completed: 1, cancelled: true, failures: [] });
});
