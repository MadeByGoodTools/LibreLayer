import test from 'node:test';
import assert from 'node:assert/strict';
import { penIntent } from '../lib/pointer-input.ts';

void test('pen tip, eraser end, and barrel button have distinct intents', () => {
  assert.equal(
    penIntent({ pointerType: 'pen', button: 0, buttons: 1, isPrimary: true }),
    'draw',
  );
  assert.equal(
    penIntent({ pointerType: 'pen', button: 5, buttons: 32, isPrimary: true }),
    'erase',
  );
  assert.equal(
    penIntent({ pointerType: 'pen', button: 2, buttons: 2, isPrimary: true }),
    'sample',
  );
});

void test('secondary touch contacts are reserved for viewport gestures', () => {
  assert.equal(
    penIntent({ pointerType: 'touch', button: 0, buttons: 1, isPrimary: false }),
    'ignore',
  );
  assert.equal(
    penIntent({ pointerType: 'touch', button: 0, buttons: 1, isPrimary: true }),
    'draw',
  );
});
