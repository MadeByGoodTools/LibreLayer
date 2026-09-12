import { readFileSync } from 'node:fs';
import {
  runVisualRegression,
  type VisualFixture,
} from '../lib/visual-regression.ts';

const fixture = JSON.parse(
  readFileSync(
    new URL('../tests/fixtures/visual-regression.json', import.meta.url),
    'utf8',
  ),
) as VisualFixture;
const results = runVisualRegression(fixture);
for (const result of results)
  console.log(
    `${result.passed ? 'PASS' : 'FAIL'} ${result.name} ${result.actualSha256}`,
  );
if (results.some((result) => !result.passed)) process.exitCode = 1;
