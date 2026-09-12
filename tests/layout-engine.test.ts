import assert from 'node:assert/strict';
import test from 'node:test';
import {
  multiScaleExportPlan,
  normalizeArtboard,
  normalizeFrame,
  smartSpacingMoves,
} from '../lib/layout-engine.ts';

void test('artboards and frames remain inside document bounds', () => {
  const artboard = normalizeArtboard(
      { id: 'a', name: ' Mobile ', x: 90, y: 70, w: 50, h: 50 },
      100,
      80,
    ),
    frame = normalizeFrame(
      { shape: 'ellipse', x: -5, y: -8, w: 400, h: 300, radius: -2 },
      100,
      80,
    );
  assert.deepEqual(
    { x: artboard.x, y: artboard.y, w: artboard.w, h: artboard.h },
    { x: 90, y: 70, w: 10, h: 10 },
  );
  assert.equal(artboard.name, 'Mobile');
  assert.deepEqual(frame, {
    shape: 'ellipse',
    x: 0,
    y: 0,
    w: 100,
    h: 80,
    radius: 0,
  });
});

void test('malformed layout numbers recover safely and offset frames stay bounded', () => {
  const artboard = normalizeArtboard(
      { x: Number.NaN, y: Infinity, w: Number.NaN, h: Infinity },
      100,
      80,
    ),
    frame = normalizeFrame(
      { x: 90, y: 70, w: 100, h: 100, radius: Number.NaN },
      100,
      80,
    );
  assert.deepEqual(
    { x: artboard.x, y: artboard.y, w: artboard.w, h: artboard.h },
    { x: 0, y: 0, w: 100, h: 80 },
  );
  assert.deepEqual(
    { x: frame.x, y: frame.y, w: frame.w, h: frame.h, radius: frame.radius },
    { x: 90, y: 70, w: 10, h: 10, radius: 0 },
  );
});

void test('smart spacing equalizes edge gaps while preserving outer objects', () => {
  const moves = smartSpacingMoves(
    [
      { id: 'a', bounds: { left: 0, right: 10, top: 0, bottom: 10 } },
      { id: 'b', bounds: { left: 20, right: 40, top: 0, bottom: 10 } },
      { id: 'c', bounds: { left: 70, right: 80, top: 0, bottom: 10 } },
    ],
    'horizontal',
  );
  assert.equal(moves.get('a'), 0);
  assert.equal(moves.get('b'), 10);
  assert.equal(moves.get('c'), 0);
});

void test('multi-scale plans are stable, named, and ignore disabled artboards', () => {
  const plan = multiScaleExportPlan(
    [
      {
        id: 'a',
        name: 'App Icon',
        x: 0,
        y: 0,
        w: 120,
        h: 80,
        background: '#ffffff',
        exportEnabled: true,
      },
      {
        id: 'b',
        name: 'Skip',
        x: 0,
        y: 0,
        w: 10,
        h: 10,
        background: '#ffffff',
        exportEnabled: false,
      },
    ],
    [3, 1, 2, 2, 9],
  );
  assert.deepEqual(
    plan.map(({ name, width, height }) => ({ name, width, height })),
    [
      { name: 'App-Icon.png', width: 120, height: 80 },
      { name: 'App-Icon@2x.png', width: 240, height: 160 },
      { name: 'App-Icon@3x.png', width: 360, height: 240 },
    ],
  );
});
