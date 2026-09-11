import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeWorkspaceLayout,
  parseWorkspaces,
  serializeWorkspaces,
} from '../lib/workspace-layout.ts';

void test('workspace collections round-trip floating panel geometry', () => {
  const source = [
      {
        name: 'Retouch',
        layout: {
          side: 'left' as const,
          width: 360,
          smart: false,
          panels: {
            Properties: { floating: true, x: 80, y: 120, width: 400 },
          },
        },
      },
    ],
    restored = parseWorkspaces(serializeWorkspaces(source));
  assert.deepEqual(restored, source);
});

void test('workspace import clamps geometry and removes duplicate names', () => {
  const restored = parseWorkspaces(
    JSON.stringify({
      format: 'librelayer-workspaces-v1',
      workspaces: [
        { name: 'Paint', layout: { side: 'left', width: 900, smart: true } },
        { name: 'paint', layout: { side: 'right', width: 280, smart: false } },
      ],
    }),
  );
  assert.equal(restored.length, 1);
  assert.equal(restored[0].layout.width, 440);
});

void test('invalid workspace files fail without changing preferences', () => {
  assert.throws(() => parseWorkspaces('{bad'), /valid JSON/);
  assert.throws(() => parseWorkspaces('{}'), /Not a LibreLayer/);
  assert.deepEqual(normalizeWorkspaceLayout(null), {
    side: 'right',
    width: 300,
    smart: true,
  });
});
