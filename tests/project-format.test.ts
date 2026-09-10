import assert from 'node:assert/strict';
import test from 'node:test';
import { packProject, unpackProject } from '../lib/project-format.ts';

const fixture = {
  format: 'librelayer',
  version: 2,
  name: 'Integrity test',
  width: 2,
  height: 1,
  layers: [{ id: 'layer-1', opacity: 100 }],
};

void test('a packaged project round-trips with a verified checksum', async () => {
  const packed = await packProject(fixture);
  assert.equal(JSON.parse(await packed.text()).format, 'librelayer-package');
  const result = await unpackProject<typeof fixture>(await packed.text());
  assert.deepEqual(result.project, fixture);
  assert.equal(result.verified, true);
});

void test('Pixel Studio package envelopes remain readable after rebranding', async () => {
  const packed = JSON.parse(await (await packProject(fixture)).text());
  packed.format = 'pixel-studio-package';
  const result = await unpackProject<typeof fixture>(JSON.stringify(packed));
  assert.deepEqual(result.project, fixture);
  assert.equal(result.verified, true);
});

void test('a changed packaged project is rejected', async () => {
  const packed = JSON.parse(await (await packProject(fixture)).text());
  packed.payload.name = 'Tampered';
  await assert.rejects(
    unpackProject(JSON.stringify(packed)),
    /integrity check/,
  );
});

void test('legacy projects remain readable without claiming verification', async () => {
  const result = await unpackProject<typeof fixture>(JSON.stringify(fixture));
  assert.deepEqual(result.project, fixture);
  assert.equal(result.verified, false);
});
