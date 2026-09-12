import assert from 'node:assert/strict';
import test from 'node:test';
import {
  anchorsFromPoints,
  combinePathMasks,
  convertAnchorKind,
  moveAnchor,
  moveAnchorHandle,
} from '../lib/path-engine.ts';

void test('curvature anchors receive mirrored editable handles', () => {
  const anchors = anchorsFromPoints(
    [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ],
    true,
    50,
  );
  assert.equal(anchors[1].kind, 'smooth');
  assert.equal(
    anchors[1].incoming!.x - anchors[1].x,
    -(anchors[1].outgoing!.x - anchors[1].x),
  );
});

void test('dragging a smooth Bézier handle mirrors its opposite control', () => {
  const anchors = convertAnchorKind(
      anchorsFromPoints(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
        ],
        false,
      ),
      1,
      'smooth',
    ),
    moved = moveAnchorHandle(anchors, 1, 'outgoing', 16, 4);
  assert.deepEqual(moved[1].outgoing, { x: 16, y: 4 });
  assert.deepEqual(moved[1].incoming, { x: 4, y: -4 });
});

void test('anchor conversion and direct movement preserve handle geometry', () => {
  const smooth = convertAnchorKind(
      anchorsFromPoints(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
        ],
        false,
      ),
      1,
      'smooth',
    ),
    moved = moveAnchor(smooth, 1, 14, 3);
  assert.equal(moved[1].x, 14);
  assert.equal(moved[1].outgoing!.x - smooth[1].outgoing!.x, 4);
  assert.equal(convertAnchorKind(moved, 1, 'corner')[1].outgoing, undefined);
});

void test('path Boolean operations match union, subtract, intersect, and exclude', () => {
  const a = Uint8ClampedArray.from([255, 255, 0, 0]),
    b = Uint8ClampedArray.from([0, 255, 255, 0]);
  assert.deepEqual([...combinePathMasks(a, b, 'union')], [255, 255, 255, 0]);
  assert.deepEqual([...combinePathMasks(a, b, 'intersect')], [0, 255, 0, 0]);
  assert.deepEqual([...combinePathMasks(a, b, 'subtract')], [255, 0, 0, 0]);
  assert.deepEqual([...combinePathMasks(a, b, 'exclude')], [255, 0, 255, 0]);
});
