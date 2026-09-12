import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterGraphKey,
  VersionedRenderCache,
} from '../lib/smart-filter-cache.ts';

const graph = (quality: 'preview' | 'final' = 'final') =>
  filterGraphKey({
    instanceId: 'source-1',
    sourceVersion: 2,
    width: 100,
    height: 80,
    quality,
    filters: [
      {
        id: 'blur',
        version: 3,
        name: 'Blur',
        amount: 4,
        opacity: 100,
        blend: 'source-over',
        enabled: true,
      },
    ],
  });

void test('filter graph keys separate preview, final, source, and parameter versions', () => {
  assert.notEqual(graph('preview'), graph('final'));
  assert.notEqual(
    graph(),
    graph().replace('source-1', 'source-2'),
  );
  assert.notEqual(
    graph(),
    filterGraphKey({
      instanceId: 'source-1',
      sourceVersion: 2,
      width: 100,
      height: 80,
      quality: 'final',
      filters: [
        {
          id: 'blur',
          version: 4,
          name: 'Blur',
          amount: 4,
          opacity: 100,
          blend: 'source-over',
          enabled: true,
        },
      ],
    }),
  );
});

void test('render cache is least-recently-used and enforces its budget', () => {
  const disposed: string[] = [],
    cache = new VersionedRenderCache<string>(5, (value) => disposed.push(value));
  cache.set('a', 'A', 2);
  cache.set('b', 'B', 2);
  assert.equal(cache.get('a'), 'A');
  cache.set('c', 'C', 2);
  assert.equal(cache.get('b'), undefined);
  assert.equal(cache.size, 2);
  assert.deepEqual(disposed, ['B']);
  cache.set('too-large', 'X', 9);
  assert.deepEqual(disposed, ['B', 'X']);
});

void test('render cache releases old entries when its runtime budget shrinks', () => {
  const disposed: string[] = [],
    cache = new VersionedRenderCache<string>(10, (value) => disposed.push(value));
  cache.set('one', 'one', 4);
  cache.set('two', 'two', 4);
  cache.setBudget(5);
  assert.equal(cache.size, 1);
  assert.equal(cache.currentCost, 4);
  assert.deepEqual(disposed, ['one']);
});
