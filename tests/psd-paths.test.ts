import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeCanvas, writePsd } from 'ag-psd';
import { createIccProfile } from '../lib/image-export.ts';
import { extractPsdIccProfile, injectPsdIccProfile } from '../lib/psd-icc.ts';
import { extractPsdPaths, injectPsdPaths } from '../lib/psd-paths.ts';

initializeCanvas(
  () => ({ width: 1, height: 1 }) as HTMLCanvasElement,
  (width, height) =>
    ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }) as ImageData,
);

void test('named open and closed Photoshop paths round-trip natively', () => {
  const source = writePsd({
      width: 100,
      height: 80,
      imageData: {
        width: 100,
        height: 80,
        data: new Uint8ClampedArray(100 * 80 * 4),
      },
    }),
    paths = [
      {
        name: 'Work Path',
        closed: true,
        anchors: [
          { x: 10, y: 10, kind: 'corner' as const },
          {
            x: 90,
            y: 10,
            kind: 'smooth' as const,
            incoming: { x: 70, y: 0 },
            outgoing: { x: 95, y: 30 },
          },
          { x: 50, y: 70, kind: 'corner' as const },
        ],
      },
      {
        name: 'Open Curve',
        closed: false,
        anchors: [
          { x: 4, y: 20, kind: 'corner' as const },
          { x: 80, y: 60, kind: 'corner' as const },
        ],
      },
    ],
    icc = createIccProfile('display-p3'),
    encoded = injectPsdIccProfile(injectPsdPaths(source, paths, 100, 80), icc),
    restored = extractPsdPaths(encoded, 100, 80);
  assert.equal(restored.length, 2);
  assert.equal(restored[0].name, 'Work Path');
  assert.equal(restored[0].closed, true);
  assert.equal(restored[1].closed, false);
  assert.ok(Math.abs(restored[0].anchors[1].incoming!.x - 70) < 0.001);
  assert.deepEqual(extractPsdIccProfile(encoded), icc);
});

void test('malformed Photoshop path records fail closed', () => {
  const source = writePsd({ width: 1, height: 1 });
  assert.throws(
    () =>
      injectPsdPaths(
        source,
        [{ name: 'Bad', closed: true, anchors: [] }],
        1,
        1,
      ),
    /Invalid PSD path geometry/,
  );
});
