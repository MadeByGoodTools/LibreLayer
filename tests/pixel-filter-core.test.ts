import assert from 'node:assert/strict';
import test from 'node:test';
import { applyPixelFilterRequest } from '../lib/pixel-filter-core.ts';

const fixture = () => {
  const pixels = new Uint8ClampedArray(8 * 8 * 4);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const offset = (y * 8 + x) * 4;
      pixels.set([x * 30, y * 30, (x + y) * 15, 255], offset);
    }
  return pixels;
};

void test('background filter dispatcher preserves each professional filter family', () => {
  const source = fixture(),
    requests = [
      {
        family: 'reference' as const,
        operation: 'smart-sharpen' as const,
        amount: 60,
        secondary: 30,
      },
      {
        family: 'distort' as const,
        operation: 'ripple' as const,
        amount: 75,
        secondary: 45,
      },
      {
        family: 'render' as const,
        operation: 'lighting' as const,
        amount: 70,
        secondary: 35,
        color: [255, 214, 170] as [number, number, number],
        kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0],
      },
    ];
  for (const request of requests) {
    const result = applyPixelFilterRequest(source, 8, 8, request);
    assert.equal(result.length, source.length);
    assert.notDeepEqual(result, source);
    assert.equal(result[3], 255);
  }
});

void test('background filter dispatcher rejects invalid pixel dimensions', () => {
  assert.throws(
    () =>
      applyPixelFilterRequest(new Uint8ClampedArray(4), 2, 2, {
        family: 'reference',
        operation: 'high-pass',
        amount: 50,
        secondary: 50,
      }),
    /dimensions/i,
  );
});
