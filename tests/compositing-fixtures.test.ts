import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  compositePixel,
  type BlendSpace,
  type NormalizedRgba,
} from '../lib/layer-compositing.ts';

type Fixture = {
  name: string;
  mode: string;
  space: BlendSpace;
  backdrop: NormalizedRgba;
  source: NormalizedRgba;
  expected: NormalizedRgba;
};

const fixtures = JSON.parse(
  readFileSync(
    new URL('./fixtures/compositing-reference.json', import.meta.url),
    'utf8',
  ),
) as Fixture[];

for (const fixture of fixtures)
  void test(`compositing reference: ${fixture.name}`, () => {
    const actual = compositePixel(
      fixture.backdrop,
      fixture.source,
      fixture.mode,
      fixture.space,
    );
    actual.forEach((value, index) =>
      assert.ok(
        Math.abs(value - fixture.expected[index]) < 1e-9,
        `${fixture.name} channel ${index}: ${value} != ${fixture.expected[index]}`,
      ),
    );
  });
