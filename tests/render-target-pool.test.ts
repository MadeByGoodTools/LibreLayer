import assert from 'node:assert/strict';
import test from 'node:test';
import { BoundedResourcePool } from '../lib/render-target-pool.ts';

void test('render targets are reused only for matching dimensions', () => {
  const disposed: string[] = [],
    pool = new BoundedResourcePool<string>(1024, (value) =>
      disposed.push(value),
    );
  pool.release('64x64', 'first', 256);
  assert.equal(
    pool.acquire('32x32', 64, () => 'second'),
    'second',
  );
  assert.equal(
    pool.acquire('64x64', 256, () => 'third'),
    'first',
  );
  assert.deepEqual(disposed, []);
});

void test('render target pool evicts least-recently-released entries by budget', () => {
  const disposed: string[] = [],
    pool = new BoundedResourcePool<string>(300, (value) =>
      disposed.push(value),
    );
  pool.release('a', 'oldest', 120);
  pool.release('b', 'middle', 120);
  pool.release('c', 'newest', 120);
  assert.deepEqual(disposed, ['oldest']);
  assert.deepEqual(pool.stats(), {
    available: 2,
    bytes: 240,
    budgetBytes: 300,
  });
});

void test('shrinking or clearing the budget releases retained resources', () => {
  const disposed: string[] = [],
    pool = new BoundedResourcePool<string>(1000, (value) =>
      disposed.push(value),
    );
  pool.release('a', 'one', 200);
  pool.release('b', 'two', 200);
  pool.setBudget(200);
  assert.deepEqual(disposed, ['one']);
  pool.clear();
  assert.deepEqual(disposed, ['one', 'two']);
  assert.equal(pool.stats().available, 0);
});
