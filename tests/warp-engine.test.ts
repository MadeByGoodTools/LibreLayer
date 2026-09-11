import test from 'node:test';
import assert from 'node:assert/strict';
import {
  warpSourcePoint,
  type WarpMode,
  type WarpPreset,
} from '../lib/warp-engine.ts';

void test('every advanced warp is neutral at zero strength', () => {
  const modes: WarpMode[] = [
    'skew',
    'distort',
    'perspective',
    'warp',
    'mesh',
    'split',
    'cylindrical',
    'puppet',
    'perspective-warp',
    'preset-warp',
  ];
  for (const mode of modes) {
    const [x, y] = warpSourcePoint(mode, 37, 21, 100, 80, 0, 0);
    assert.ok(Math.abs(x - 37) < 1e-9, `${mode} changed x`);
    assert.ok(Math.abs(y - 21) < 1e-9, `${mode} changed y`);
  }
});

void test('mesh, split, cylindrical, and perspective warps are distinct', () => {
  const results = ['mesh', 'split', 'cylindrical', 'perspective-warp'].map(
    (mode) =>
      warpSourcePoint(mode as WarpMode, 31, 17, 100, 80, 55, -30).map(
        (value) => value.toFixed(4),
      ),
  );
  assert.equal(new Set(results.map((point) => point.join(','))).size, 4);
});

void test('all named warp presets produce finite distinct coordinates', () => {
  const presets: WarpPreset[] = ['arc', 'flag', 'fisheye', 'twist'],
    points = presets.map((preset) =>
      warpSourcePoint('preset-warp', 28, 19, 100, 80, 60, 25, preset),
    );
  assert.equal(new Set(points.map((point) => point.join(','))).size, 4);
  assert.ok(points.flat().every(Number.isFinite));
});
