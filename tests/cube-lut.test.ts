import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCubeLut, parseCubeLut } from '../lib/cube-lut.ts';

const identity = `TITLE "Identity 2"
LUT_3D_SIZE 2
DOMAIN_MIN 0 0 0
DOMAIN_MAX 1 1 1
0 0 0
1 0 0
0 1 0
1 1 0
0 0 1
1 0 1
0 1 1
1 1 1`;

void test('3D cube LUTs parse with bounded metadata', () => {
  const lut = parseCubeLut(identity);
  assert.equal(lut.title, 'Identity 2');
  assert.equal(lut.size, 2);
  assert.equal(lut.data.length, 24);
});

void test('identity LUT interpolation preserves intermediate colors', () => {
  const output = applyCubeLut(0.2, 0.4, 0.7, parseCubeLut(identity), 1);
  output.forEach((value, index) =>
    assert.ok(Math.abs(value - [0.2, 0.4, 0.7][index]) < 1e-7),
  );
});

void test('LUT amount blends the correction with the source', () => {
  const inverted = parseCubeLut(
    identity.replace(
      /^(\d) (\d) (\d)$/gm,
      (_, r, g, b) => `${1 - Number(r)} ${1 - Number(g)} ${1 - Number(b)}`,
    ),
  );
  assert.deepEqual(applyCubeLut(0, 0, 0, inverted, 0.5), [0.5, 0.5, 0.5]);
});

void test('invalid and unsupported LUT files fail explicitly', () => {
  assert.throws(() => parseCubeLut('LUT_1D_SIZE 16'), /1D/);
  assert.throws(() => parseCubeLut('LUT_3D_SIZE 2\n0 0 0'), /Expected/);
});
