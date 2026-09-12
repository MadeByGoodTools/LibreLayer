import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyLiquifyFaceControls,
  applyLiquifyStroke,
  createLiquifyMesh,
  isLiquifyMesh,
  liquifySourcePoint,
  normalizeLiquifyMesh,
  renderLiquifyPixels,
} from '../lib/liquify-engine.ts';

void test('forward liquify creates a smooth reusable displacement mesh', () => {
  const mesh = createLiquifyMesh(100, 80, 9, 7),
    moved = applyLiquifyStroke(
      mesh,
      'forward',
      { x: 50, y: 40 },
      { x: 12, y: -4 },
      35,
      0.8,
    ),
    source = liquifySourcePoint(moved, 50, 40);
  assert.ok(source.x < 50);
  assert.ok(source.y > 40);
  assert.deepEqual(mesh.dx, Array(63).fill(0));
});

void test('freeze protects displacement and thaw restores editing', () => {
  const original = createLiquifyMesh(100, 100, 9, 9),
    frozen = applyLiquifyStroke(
      original,
      'freeze',
      { x: 50, y: 50 },
      { x: 0, y: 0 },
      50,
      1,
    ),
    protectedMesh = applyLiquifyStroke(
      frozen,
      'forward',
      { x: 50, y: 50 },
      { x: 30, y: 0 },
      20,
      1,
    ),
    unprotected = applyLiquifyStroke(
      original,
      'forward',
      { x: 50, y: 50 },
      { x: 30, y: 0 },
      20,
      1,
    ),
    thawed = applyLiquifyStroke(
      protectedMesh,
      'thaw',
      { x: 50, y: 50 },
      { x: 0, y: 0 },
      50,
      1,
    ),
    editable = applyLiquifyStroke(
      thawed,
      'forward',
      { x: 50, y: 50 },
      { x: 30, y: 0 },
      20,
      1,
    );
  assert.ok(
    Math.max(...protectedMesh.dx.map(Math.abs)) <
      Math.max(...unprotected.dx.map(Math.abs)),
  );
  assert.ok(Math.abs(protectedMesh.dx[40]) < 0.1);
  assert.ok(Math.max(...editable.dx.map(Math.abs)) > 1);
});

void test('face controls produce distinct bounded deformations', () => {
  const mesh = createLiquifyMesh(120, 160, 13, 17),
    eyes = applyLiquifyFaceControls(mesh, { eyeSize: 70 }),
    smile = applyLiquifyFaceControls(mesh, { smile: 70 });
  assert.notDeepEqual(eyes.dx, smile.dx);
  assert.ok(eyes.dx.every(Number.isFinite));
  assert.ok(smile.dy.every(Number.isFinite));
});

void test('liquify rendering is neutral before a mesh is edited', () => {
  const mesh = createLiquifyMesh(4, 3, 4, 4),
    pixels = new Uint8ClampedArray(4 * 3 * 4).map(
      (_, index) => (index * 9) & 255,
    );
  assert.deepEqual(renderLiquifyPixels(pixels, mesh), pixels);
  assert.deepEqual(normalizeLiquifyMesh({ ...mesh, dx: [] }), mesh);
  assert.equal(isLiquifyMesh(mesh, 4, 3), true);
  assert.equal(isLiquifyMesh({ ...mesh, frozen: [0] }, 4, 3), false);
});
