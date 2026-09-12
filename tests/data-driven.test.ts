import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dataRecordName,
  parseDataSet,
  substituteDataVariables,
} from '../lib/data-driven.ts';

void test('CSV datasets preserve quoted commas and escaped quotes', () => {
  const data = parseDataSet(
    'name,caption\nOne,"Hello, world"\nTwo,"A ""quote"""',
    'Cards',
  );
  assert.equal(data.name, 'Cards');
  assert.deepEqual(data.columns, ['name', 'caption']);
  assert.equal(data.records[0].caption, 'Hello, world');
  assert.equal(data.records[1].caption, 'A "quote"');
});

void test('portable datasets round-trip and reject unknown versions', () => {
  const data = parseDataSet('[{"title":"First","year":2026}]', 'Release');
  assert.equal(parseDataSet(JSON.stringify(data)).records[0].year, '2026');
  assert.throws(() => parseDataSet(JSON.stringify({ ...data, version: 2 })));
});

void test('text variables replace known fields and retain unknown placeholders', () => {
  assert.equal(
    substituteDataVariables('{{name}} — {{ missing }}', { name: 'LibreLayer' }),
    'LibreLayer — {{ missing }}',
  );
  assert.equal(dataRecordName({ filename: 'A/B:C' }, 0), 'A-B-C');
});
