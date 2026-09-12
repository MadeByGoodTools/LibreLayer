import test from 'node:test';
import assert from 'node:assert/strict';
import { assertAcyclicSmartObjectGraph } from '../lib/smart-object-graph.ts';

void test('shared instances and nested acyclic objects are accepted', () => {
  assert.doesNotThrow(() =>
    assertAcyclicSmartObjectGraph([
      { instanceId: 'shared', dependencies: ['embedded'] },
      { instanceId: 'shared', dependencies: ['embedded'] },
      { instanceId: 'embedded', dependencies: [] },
    ]),
  );
});

void test('direct and indirect Smart Object cycles are rejected', () => {
  assert.throws(
    () => assertAcyclicSmartObjectGraph([{ instanceId: 'a', dependencies: ['a'] }]),
    /Cyclic/,
  );
  assert.throws(
    () =>
      assertAcyclicSmartObjectGraph([
        { instanceId: 'a', dependencies: ['b'] },
        { instanceId: 'b', dependencies: ['c'] },
        { instanceId: 'c', dependencies: ['a'] },
      ]),
    /Cyclic/,
  );
});

