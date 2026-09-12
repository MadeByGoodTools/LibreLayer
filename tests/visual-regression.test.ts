import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  runVisualRegression,
  type VisualFixture,
} from '../lib/visual-regression.ts';

const fixture = JSON.parse(
  readFileSync(
    new URL('./fixtures/visual-regression.json', import.meta.url),
    'utf8',
  ),
) as VisualFixture;

void test('stable visual fixture pack matches every golden pixel hash', () => {
  const results = runVisualRegression(fixture);
  assert.deepEqual(
    results.filter((result) => !result.passed),
    [],
    results.map((result) => `${result.name}: ${result.actualSha256}`).join('\n'),
  );
});
