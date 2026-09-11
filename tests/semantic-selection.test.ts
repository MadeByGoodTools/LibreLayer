import assert from 'node:assert/strict';
import test from 'node:test';
import { semanticPixelWeight } from '../lib/semantic-selection.ts';

void test('sky selection favors blue pixels near the top of the image', () => {
  const upperBlue = semanticPixelWeight('sky', 75, 160, 235, 255, 0.5, 0.1),
    lowerBlue = semanticPixelWeight('sky', 75, 160, 235, 255, 0.5, 0.95),
    upperRed = semanticPixelWeight('sky', 220, 70, 60, 255, 0.5, 0.1);
  assert.ok(upperBlue > lowerBlue);
  assert.ok(upperBlue > upperRed);
});

void test('skin selection recognizes warm skin-shaped channel relationships', () => {
  const skin = semanticPixelWeight('skin', 205, 145, 112, 255, 0.5, 0.4),
    blue = semanticPixelWeight('skin', 55, 110, 220, 255, 0.5, 0.4);
  assert.ok(skin > 0.35);
  assert.ok(skin > blue);
});

void test('hair and clothing selections use different spatial priors', () => {
  const darkTop = semanticPixelWeight('hair', 45, 32, 28, 255, 0.5, 0.2),
    darkBottom = semanticPixelWeight('hair', 45, 32, 28, 255, 0.5, 0.9),
    fabricBottom = semanticPixelWeight('clothing', 35, 85, 190, 255, 0.5, 0.8),
    fabricTop = semanticPixelWeight('clothing', 35, 85, 190, 255, 0.5, 0.1);
  assert.ok(darkTop > darkBottom);
  assert.ok(fabricBottom > fabricTop);
});

void test('semantic selections exclude transparent pixels and respond to sensitivity', () => {
  assert.equal(semanticPixelWeight('sky', 70, 150, 230, 0, 0.5, 0.1), 0);
  assert.ok(
    semanticPixelWeight('sky', 70, 150, 230, 255, 0.5, 0.1, 90) >
      semanticPixelWeight('sky', 70, 150, 230, 255, 0.5, 0.1, 10),
  );
});
