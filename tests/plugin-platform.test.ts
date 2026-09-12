import assert from 'node:assert/strict';
import test from 'node:test';
import {
  comparePluginVersions,
  installPlugin,
  pluginFilterManifest,
  validatePluginManifest,
  type LibreLayerPluginManifest,
} from '../lib/plugin-platform.ts';
import { applyFilterPlugin } from '../lib/filter-plugin.ts';
import { compilePixelExpression } from '../lib/safe-expression.ts';

const plugin: LibreLayerPluginManifest = {
  format: 'librelayer-plugin',
  manifestVersion: 1,
  id: 'goodtools.sample-grade',
  name: 'Sample Grade',
  version: '1.2.0',
  description: 'A fully local test plug-in.',
  hostApi: 1,
  permissions: [
    'document.readPixels',
    'document.writePixels',
    'document.readComposite',
    'panel.show',
    'storage.settings',
    'export.download',
  ],
  contributes: {
    panel: {
      title: 'Sample controls',
      controls: [
        {
          id: 'amount',
          label: 'Amount',
          kind: 'slider',
          default: 70,
          min: 0,
          max: 100,
        },
        {
          id: 'protect-highlights',
          label: 'Protect highlights',
          kind: 'checkbox',
          default: true,
        },
      ],
    },
    filters: [
      {
        id: 'warm',
        label: 'Warm locally',
        cpuKernel: [0, 0, 0, 0, 1, 0, 0, 0, 0],
        javascript: {
          red: 'clamp(r + 20)',
          green: 'g',
          blue: 'clamp(b - 10)',
        },
      },
    ],
    exporters: [
      {
        id: 'web-preview',
        label: 'Web preview',
        format: 'webp',
        extension: 'webp',
        quality: 0.82,
      },
    ],
  },
};

void test('validates a versioned permission-gated plug-in manifest', () => {
  const validated = validatePluginManifest(plugin);
  assert.deepEqual(validated, plugin);
  assert.notEqual(validated.permissions, plugin.permissions);
  assert.throws(
    () =>
      validatePluginManifest({
        ...plugin,
        permissions: plugin.permissions.filter(
          (permission) => permission !== 'document.writePixels',
        ),
      }),
    /document\.writePixels permission/,
  );
  assert.throws(
    () => validatePluginManifest({ ...plugin, permissions: ['network'] }),
    /unsupported permission/,
  );
});

void test('installs upgrades and rejects accidental downgrades', () => {
  const installed = installPlugin([], plugin);
  assert.equal(installed[0].version, '1.2.0');
  assert.equal(
    installPlugin(installed, { ...plugin, version: '1.3.0' })[0].version,
    '1.3.0',
  );
  assert.throws(
    () => installPlugin(installed, { ...plugin, version: '1.1.9' }),
    /newer/,
  );
  assert.ok(comparePluginVersions('2.0.0', '1.99.99') > 0);
});

void test('restricted JavaScript expressions cannot access globals or properties', () => {
  const expression = compilePixelExpression('clamp((r + g) / 2, 0, 255)');
  assert.equal(
    expression({
      r: 100,
      g: 50,
      b: 0,
      a: 255,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      amount: 1,
    }),
    75,
  );
  assert.throws(() => compilePixelExpression('fetch("https://example.com")'));
  assert.throws(() => compilePixelExpression('globalThis.process'));
  assert.throws(() => compilePixelExpression('r = 0'));
});

void test('runs a JavaScript plug-in filter through the bounded filter engine', async () => {
  const manifest = pluginFilterManifest(plugin, plugin.contributes.filters![0]),
    source = new Uint8ClampedArray([100, 80, 60, 255]),
    full = await applyFilterPlugin(manifest, source, 1, 1, 100),
    half = await applyFilterPlugin(manifest, source, 1, 1, 50);
  assert.deepEqual([...full.pixels], [120, 80, 50, 255]);
  assert.deepEqual([...half.pixels], [110, 80, 55, 255]);
  assert.deepEqual([...source], [100, 80, 60, 255]);
});
