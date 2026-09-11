import assert from 'node:assert/strict';
import test from 'node:test';
import { createPsdCompatibilityReport } from '../lib/psd-compatibility.ts';

void test('PSD report counts editable structure and depth conversion', () => {
  const report = createPsdCompatibilityReport('test.psd', {
    width: 800,
    height: 600,
    bitDepth: 16,
    warnings: [],
    children: [
      { name: 'Group', children: [{ name: 'Pixels', mask: {} }] },
      { name: 'Top' },
    ],
  });
  assert.equal(report.status, 'converted');
  assert.equal(report.groups, 1);
  assert.equal(report.pixelLayers, 2);
  assert.equal(report.masks, 1);
});

void test('PSD warnings produce an explicit flattened report', () => {
  const report = createPsdCompatibilityReport('complex.psd', {
    width: 1,
    height: 1,
    bitDepth: 8,
    warnings: ['Unsupported live object'],
    children: [],
  });
  assert.equal(report.status, 'flattened');
  assert.deepEqual(report.warnings, ['Unsupported live object']);
});
