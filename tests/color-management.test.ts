import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COLOR_PROFILES,
  convertColor,
  convertRgba,
  convertRgbaChunked,
  installedIccProfiles,
  loadInstalledIccProfiles,
  normalizeColorProfile,
  normalizeRenderingIntent,
  parseIccProfile,
  registerIccProfile,
  resolveColorProfile,
  saveInstalledIccProfiles,
  validatePortableIccProfile,
} from '../lib/color-management.ts';
import { createIccProfile } from '../lib/image-export.ts';

void test('color profiles expose versioned professional RGB spaces', () => {
  assert.deepEqual(
    Object.values(COLOR_PROFILES).map(({ id, version }) => [id, version]),
    [
      ['srgb', 4],
      ['display-p3', 4],
      ['adobe-rgb', 2],
      ['prophoto-rgb', 2],
    ],
  );
  assert.equal(normalizeColorProfile('missing'), 'srgb');
  assert.equal(normalizeRenderingIntent('perceptual'), 'perceptual');
  assert.equal(normalizeRenderingIntent('missing'), 'relative-colorimetric');
});

void test('profile conversion preserves neutral appearance and round trips', () => {
  const source = [0.22, 0.5, 0.81] as const,
    p3 = convertColor(source, 'srgb', 'display-p3'),
    restored = convertColor(p3, 'display-p3', 'srgb');
  restored.forEach((value, index) =>
    assert.ok(Math.abs(value - source[index]) < 0.012),
  );
  const neutral = convertColor(
    [0.5, 0.5, 0.5],
    'prophoto-rgb',
    'srgb',
    'relative-colorimetric',
    false,
  );
  assert.ok(Math.max(...neutral) - Math.min(...neutral) < 0.002);
});

void test('rendering intents produce bounded display output while preserving alpha', () => {
  const source = new Uint8ClampedArray([255, 16, 180, 91]);
  for (const intent of ['perceptual', 'saturation'] as const) {
    const output = convertRgba(source, 'display-p3', 'srgb', intent, true);
    assert.ok(output[0] >= 0 && output[0] <= 255);
    assert.ok(output[1] >= 0 && output[1] <= 255);
    assert.ok(output[2] >= 0 && output[2] <= 255);
    assert.equal(output[3], 91);
  }
});

void test('floating-point conversion retains extended range for high-depth documents', () => {
  const source = new Float32Array([1.25, 0.4, 0.1, 0.75]),
    output = convertRgba(
      source,
      'display-p3',
      'prophoto-rgb',
      'relative-colorimetric',
      false,
    );
  assert.ok(output instanceof Float32Array);
  assert.equal(output[3], 0.75);
  assert.ok(output.every(Number.isFinite));
});

void test('chunked conversion matches the reference path and reports progress', async () => {
  const source = new Uint8ClampedArray(20_000 * 4);
  for (let index = 0; index < source.length; index++)
    source[index] = (index * 47) % 256;
  const progress: number[] = [],
    expected = convertRgba(source, 'srgb', 'display-p3', 'perceptual', true),
    output = await convertRgbaChunked(
      source,
      'srgb',
      'display-p3',
      'perceptual',
      true,
      {
        chunkPixels: 4096,
        onProgress: (value) => progress.push(value),
      },
    );
  assert.deepEqual(output, expected);
  assert.equal(progress.at(-1), 100);
  assert.ok(progress.length > 1);
  assert.ok(
    progress.every((value, index) => !index || value >= progress[index - 1]),
  );
});

void test('chunked conversion cancels without changing its source', async () => {
  const source = new Float32Array([0.25, 0.5, 0.75, 1]),
    untouched = new Float32Array(source),
    controller = new AbortController();
  controller.abort();
  await assert.rejects(
    convertRgbaChunked(
      source,
      'srgb',
      'prophoto-rgb',
      'relative-colorimetric',
      true,
      { signal: controller.signal },
    ),
    /cancelled/,
  );
  assert.deepEqual(source, untouched);
});

void test('user-supplied ICC v2 matrix profiles parse, register, and convert', async () => {
  const parsed = await parseIccProfile(createIccProfile('adobe-rgb')),
    registered = registerIccProfile(parsed),
    converted = convertColor(
      [0.17, 0.48, 0.82],
      registered,
      'srgb',
      'relative-colorimetric',
      false,
    ),
    restored = convertColor(
      converted,
      'srgb',
      registered,
      'relative-colorimetric',
      false,
    );
  assert.equal(parsed.version, 2);
  assert.match(parsed.id, /^icc-[a-f0-9]{24}$/);
  assert.equal(
    resolveColorProfile(parsed.id).name,
    'LibreLayer Adobe RGB (1998)',
  );
  restored.forEach((value, index) =>
    assert.ok(Math.abs(value - [0.17, 0.48, 0.82][index]) < 0.002),
  );
});

void test('ICC v4 matrix profiles and device-local libraries survive reload', async () => {
  const bytes = new Uint8Array(createIccProfile('display-p3'));
  bytes[8] = 4;
  const parsed = registerIccProfile(await parseIccProfile(bytes));
  assert.equal(parsed.version, 4);
  let stored = '';
  saveInstalledIccProfiles({ setItem: (_key, value) => (stored = value) });
  assert.ok(stored.includes(parsed.id));
  const loaded = loadInstalledIccProfiles({ getItem: () => stored });
  assert.ok(loaded.some(({ id }) => id === parsed.id));
  assert.ok(installedIccProfiles().some(({ id }) => id === parsed.id));
});

void test('ICC imports reject malformed, unsupported, and forged profile data', async () => {
  const malformed = new Uint8Array(createIccProfile('srgb'));
  malformed.set([0, 0, 0, 0], 36);
  await assert.rejects(parseIccProfile(malformed), /not an ICC profile/);

  const parsed = await parseIccProfile(createIccProfile('prophoto-rgb'));
  assert.throws(
    () =>
      validatePortableIccProfile({
        ...parsed,
        id: 'icc-000000000000000000000000',
      }),
    /Invalid or unsupported ICC matrix profile/,
  );
  assert.deepEqual(loadInstalledIccProfiles({ getItem: () => '{broken' }), []);
});
