import assert from 'node:assert/strict';
import test from 'node:test';
import {
  levelPosition,
  levelValueFromPosition,
} from '../lib/levels-control.ts';

void test('level handles map their neutral values to expected positions', () => {
  assert.equal(levelPosition('levelsBlack', 0), 0);
  assert.equal(levelPosition('levelsGamma', 1), 0.5);
  assert.equal(levelPosition('levelsWhite', 255), 1);
});

void test('black and white handles cannot cross', () => {
  assert.equal(levelValueFromPosition('levelsBlack', 1, 0, 200), 199);
  assert.equal(levelValueFromPosition('levelsWhite', 0, 100, 255), 101);
});

void test('gamma position round-trips across both sides of neutral', () => {
  for (const gamma of [0.1, 0.5, 1, 1.5, 3])
    assert.ok(
      Math.abs(
        levelValueFromPosition(
          'levelsGamma',
          levelPosition('levelsGamma', gamma),
          0,
          255,
        ) - gamma,
      ) < 0.01,
    );
});
