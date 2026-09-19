import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseSvgDocument,
  parseSvgPathData,
  serializeSvgDocument,
} from '../lib/svg-path.ts';

void test('SVG cubic paths retain editable incoming and outgoing handles', () => {
  const parsed = parseSvgPathData('M 10 20 C 30 20 40 50 60 50 Z');
  assert.equal(parsed.closed, true);
  assert.deepEqual(parsed.anchors[0].outgoing, { x: 30, y: 20 });
  assert.deepEqual(parsed.anchors[1].incoming, { x: 40, y: 50 });
});

void test('SVG import preserves professional stroke settings and variable width', () => {
  const [path] = parseSvgDocument(
    '<svg><path id="Curve" d="M0 0 L20 0 L20 20 Z" stroke="#12abef" stroke-width="8" stroke-linecap="square" stroke-linejoin="bevel" stroke-dasharray="4 2" data-librelayer-width-start="3" data-librelayer-width-end="12"/></svg>',
  );
  assert.equal(path.name, 'Curve');
  assert.deepEqual(path.stroke, {
    color: '#12abef',
    widthStart: 3,
    widthEnd: 12,
    cap: 'square',
    join: 'bevel',
    dash: [4, 2],
  });
});

void test('SVG export and reimport round-trip curves and stroke metadata', () => {
  const source = parseSvgDocument(
      '<svg><path id="Roundtrip" d="M10 10 Q20 0 30 10 Z" stroke="#ffffff"/></svg>',
    ),
    svg = serializeSvgDocument(source, 100, 80),
    restored = parseSvgDocument(svg);
  assert.equal(restored[0].anchors.length, 2);
  assert.equal(restored[0].closed, true);
  assert.match(svg, /data-librelayer-width-start/);
});

void test('SVG smooth curves, primitives, inline styles, and transforms stay editable', () => {
  const paths = parseSvgDocument(`
    <svg>
      <path id="Smooth" d="M0 0 C10 0 10 10 20 10 S30 20 40 10 Q50 0 60 10 T80 10" />
      <rect id="Box" x="2" y="3" width="10" height="20" transform="translate(5 7)" style="stroke:#ff0000;stroke-width:6" />
      <circle id="Dot" cx="30" cy="40" r="5" />
      <polygon id="Triangle" points="0,0 10,0 5,10" />
    </svg>`);
  assert.equal(paths.length, 4);
  assert.equal(paths[0].anchors.length, 5);
  assert.equal(paths[1].anchors[0].x, 7);
  assert.equal(paths[1].anchors[0].y, 10);
  assert.equal(paths[1].anchors[0].kind, 'corner');
  assert.equal(paths[1].stroke.color, '#ff0000');
  assert.equal(paths[1].stroke.widthStart, 6);
  assert.equal(paths[2].anchors.length, 4);
  assert.equal(paths[2].closed, true);
  assert.equal(paths[3].anchors.length, 3);
  assert.equal(paths[3].closed, true);
});

void test('SVG elliptical arcs become editable cubic Bezier anchors', () => {
  const path = parseSvgPathData('M 10 50 A 40 30 20 0 1 90 50');
  assert.equal(path.closed, false);
  assert.ok(path.anchors.length >= 2);
  assert.deepEqual(
    { x: path.anchors.at(-1)!.x, y: path.anchors.at(-1)!.y },
    { x: 90, y: 50 },
  );
  assert.ok(path.anchors[0].outgoing);
  assert.ok(path.anchors.at(-1)!.incoming);
});

void test('unsafe or unsupported SVG content fails explicitly', () => {
  assert.throws(() => parseSvgDocument('<html></html>'), /not an SVG/);
  assert.throws(
    () => parseSvgDocument('<svg><script>alert(1)</script></svg>'),
    /unsafe/i,
  );
});
