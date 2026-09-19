import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EncryptedProjectPasswordInvalid,
  EncryptedProjectPasswordRequired,
  packEncryptedProject,
  packProject,
  unpackProject,
} from '../lib/project-format.ts';
import { parseIccProfile } from '../lib/color-management.ts';
import { createIccProfile } from '../lib/image-export.ts';

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

void test('layered embedded Smart Object sources survive project packaging', async () => {
  const project = {
      ...fixture,
      layers: [
        {
          id: 'smart-layer',
          smartObject: {
            kind: 'embedded',
            instanceId: 'shared-source',
            embeddedDocument: {
              version: 1,
              width: 2,
              height: 1,
              selectedId: 'inside',
              layers: [{ id: 'inside', name: 'Inside' }],
              surfaces: [
                { id: 'inside', pixels: 'data:image/png;base64,AAAA' },
              ],
            },
          },
        },
      ],
    },
    result = await unpackProject<typeof project>(
      await (await packProject(project)).text(),
    );
  assert.deepEqual(result.project, project);
});

void test('custom ICC working profiles survive project packaging', async () => {
  const colorProfileData = await parseIccProfile(createIccProfile('adobe-rgb')),
    project = {
      ...fixture,
      colorProfile: colorProfileData.id,
      colorProfileData,
    },
    result = await unpackProject<typeof project>(
      await (await packProject(project)).text(),
    );
  assert.deepEqual(result.project, project);
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

void test('encrypted projects round-trip locally without exposing plaintext', async () => {
  const project = {
      name: 'Private portrait',
      layers: [{ id: 'secret-layer' }],
    },
    blob = await packEncryptedProject(project, 'a strong local password'),
    text = await blob.text();
  assert.equal(text.includes('Private portrait'), false);
  assert.equal(text.includes('secret-layer'), false);
  await assert.rejects(unpackProject(text), EncryptedProjectPasswordRequired);
  await assert.rejects(
    unpackProject(text, 'the wrong password'),
    EncryptedProjectPasswordInvalid,
  );
  const opened = await unpackProject<typeof project>(
    text,
    'a strong local password',
  );
  assert.deepEqual(opened.project, project);
  assert.equal(opened.verified, true);
  assert.equal(opened.encrypted, true);
});
