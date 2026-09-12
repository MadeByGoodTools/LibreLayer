import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyCpuFilterPlugin,
  applyFilterPlugin,
  validateFilterPlugin,
  type FilterPluginManifest,
} from '../lib/filter-plugin.ts';

const identity: FilterPluginManifest = {
  format: 'librelayer-filter-plugin',
  version: 1,
  id: 'test.identity',
  name: 'Identity',
  pluginVersion: '1.0.0',
  cpuKernel: [0, 0, 0, 0, 1, 0, 0, 0, 0],
};

void test('validates and copies a constrained filter manifest', () => {
  const result = validateFilterPlugin(identity);
  assert.deepEqual(result, identity);
  assert.notEqual(result.cpuKernel, identity.cpuKernel);
  assert.throws(
    () => validateFilterPlugin({ ...identity, cpuKernel: [1, 2] }),
    /nine safe coefficients/,
  );
});

void test('CPU fallback is deterministic, amount-aware, and preserves alpha', () => {
  const source = new Uint8ClampedArray([
    10, 20, 30, 40, 100, 110, 120, 130,
  ]);
  assert.deepEqual(
    applyCpuFilterPlugin(source, 2, 1, identity.cpuKernel, 100),
    source,
  );
  const dark = applyCpuFilterPlugin(
    source,
    2,
    1,
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    50,
  );
  assert.deepEqual([...dark], [5, 10, 15, 40, 50, 55, 60, 130]);
  assert.deepEqual(
    applyCpuFilterPlugin(source, 2, 1, identity.cpuKernel, 100),
    applyCpuFilterPlugin(source, 2, 1, identity.cpuKernel, 100),
  );
});

void test('runs a valid isolated WebAssembly module when available', async () => {
  const wasmModule = Uint8Array.from([
    0, 97, 115, 109, 1, 0, 0, 0, 1, 9, 1, 96, 5, 127, 127, 127, 127,
    127, 0, 3, 2, 1, 0, 5, 3, 1, 0, 1, 7, 20, 2, 6, 109, 101, 109,
    111, 114, 121, 2, 0, 7, 112, 114, 111, 99, 101, 115, 115, 0, 0, 10,
    4, 1, 2, 0, 11,
  ]);
  const source = new Uint8ClampedArray([9, 8, 7, 6]);
  const result = await applyFilterPlugin(
    { ...identity, wasmBase64: Buffer.from(wasmModule).toString('base64') },
    source,
    1,
    1,
    75,
  );
  assert.equal(result.backend, 'wasm');
  assert.deepEqual(result.pixels, source);
});

void test('invalid WebAssembly falls back to the declared CPU kernel', async () => {
  const source = new Uint8ClampedArray([12, 24, 36, 48]);
  const result = await applyFilterPlugin(
    { ...identity, wasmBase64: 'bm90LXdhc20=' },
    source,
    1,
    1,
  );
  assert.equal(result.backend, 'cpu');
  assert.match(result.warning ?? '', /WebAssembly|magic/i);
  assert.deepEqual(result.pixels, source);
});

void test('CPU filter jobs report bounded monotonic progress through completion', async () => {
  const progress: number[] = [],
    source = new Uint8ClampedArray(4 * 8 * 8).fill(80);
  await applyFilterPlugin(identity, source, 8, 8, 100, (value) =>
    progress.push(value),
  );
  assert.ok(progress.length > 1);
  assert.equal(progress.at(-1), 100);
  assert.equal(
    progress.every(
      (value, index) =>
        value >= 0 && value <= 100 && (!index || value >= progress[index - 1]),
    ),
    true,
  );
});
