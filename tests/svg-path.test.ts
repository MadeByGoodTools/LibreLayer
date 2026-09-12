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

void test('unsafe or unsupported SVG content fails explicitly', () => {
  assert.throws(() => parseSvgDocument('<html></html>'), /not an SVG/);
  assert.throws(
    () => parseSvgDocument('<svg><path d="M0 0 A 10 10 0 0 0 20 20"/></svg>'),
    /Unsupported SVG path command/,
  );
});
