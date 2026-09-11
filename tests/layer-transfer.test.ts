import assert from 'node:assert/strict';
import test from 'node:test';
import { planLayerTransfer } from '../lib/layer-transfer.ts';

const ids = () => {
  let index = 0;
  return () => `new-${++index}`;
};

void test('cross-document transfer preserves editable recipes and nested groups', () => {
  const source = [
    { id: 'group', name: 'Retouch', kind: 'group' },
    {
      id: 'fill',
      parentId: 'group',
      name: 'Gradient',
      kind: 'fill',
      fillLayer: { type: 'gradient', angle: 37 },
      effects: { contour: 'ring', scale: 140 },
    },
    {
      id: 'adjustment',
      parentId: 'group',
      name: 'Grade',
      kind: 'adjustment',
      precisionAdjustment: { exposure: 0.4 },
      vectorMask: [{ x: 10, y: 20 }],
    },
    { id: 'outside', name: 'Outside', kind: 'pixel' },
  ];
  const plan = planLayerTransfer(source, ['group'], ids());

  assert.equal(plan.layers.length, 3);
  assert.deepEqual(plan.rootIds, ['new-1']);
  assert.equal(plan.layers[1].parentId, 'new-1');
  assert.equal(plan.layers[2].parentId, 'new-1');
  assert.deepEqual(plan.layers[1].fillLayer, {
    type: 'gradient',
    angle: 37,
  });
  assert.deepEqual(plan.layers[1].effects, {
    contour: 'ring',
    scale: 140,
  });
  assert.notEqual(plan.layers[1].fillLayer, source[1].fillLayer);
  assert.notEqual(plan.layers[2].vectorMask, source[2].vectorMask);
});

void test('transferred roots detach from unselected parents', () => {
  const source = [
    { id: 'parent', name: 'Parent' },
    { id: 'child', parentId: 'parent', name: 'Child' },
  ];
  const plan = planLayerTransfer(source, ['child'], ids());

  assert.equal(plan.layers.length, 1);
  assert.equal(plan.layers[0].parentId, undefined);
});

void test('links are remapped inside the copy without retaining source ids', () => {
  const source = [
    { id: 'one', name: 'One', linkId: 'source-link' },
    { id: 'two', name: 'Two', linkId: 'source-link' },
  ];
  const plan = planLayerTransfer(source, ['one', 'two'], ids());

  assert.ok(plan.layers[0].linkId);
  assert.equal(plan.layers[0].linkId, plan.layers[1].linkId);
  assert.notEqual(plan.layers[0].linkId, 'source-link');
  assert.notEqual(plan.layers[0].id, source[0].id);
});
