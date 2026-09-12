import assert from 'node:assert/strict';
import test from 'node:test';
import {
  actionExecutionPlan,
  applyPixelAction,
  createActionSet,
  createDroplet,
  parseActionSet,
  parseDroplet,
  processorOutputName,
} from '../lib/automation.ts';

const options = { amount: 50, secondary: 40, color: '#6d8cff', text: '' };
const action = {
  id: 'grade-photo',
  name: 'Grade photo',
  steps: [
    {
      id: 'contrast',
      command: 'auto-contrast',
      options,
      enabled: true,
      condition: 'landscape' as const,
      stopOnFailure: true,
    },
    {
      id: 'disabled',
      command: 'desaturate',
      options,
      enabled: false,
      condition: 'always' as const,
      stopOnFailure: false,
    },
  ],
};

void test('action sets round-trip conditional editable steps', () => {
  const set = createActionSet('Editorial', [action], 'editorial');
  const parsed = parseActionSet(JSON.stringify(set));
  assert.deepEqual(parsed.actions, [action]);
  assert.equal(parsed.name, 'Editorial');
});

void test('execution plans honor document conditions and disabled steps', () => {
  const plan = actionExecutionPlan(action, {
    width: 1600,
    height: 900,
    hasSelection: false,
    layerKind: 'pixel',
  });
  assert.deepEqual(plan.map((entry) => entry.run), [true, false]);
  const portrait = actionExecutionPlan(action, {
    width: 900,
    height: 1600,
    hasSelection: false,
    layerKind: 'pixel',
  });
  assert.equal(portrait[0].run, false);
});

void test('portable droplets retain action and bounded processor settings', () => {
  const droplet = createDroplet('Web grade', action, {
    format: 'jpeg',
    quality: 88,
    maxEdge: 2400,
    suffix: '-web',
  });
  assert.deepEqual(parseDroplet(JSON.stringify(droplet)), droplet);
  assert.equal(processorOutputName('Portrait.RAW', droplet.output), 'Portrait-web.jpg');
});

void test('Image Processor applies only runnable pixel steps to a copy', () => {
  const source = new Uint8ClampedArray([20, 40, 80, 255]);
  const runnable = {
    ...action,
    steps: [
      { ...action.steps[0], command: 'desaturate', condition: 'pixel-layer' as const },
      { ...action.steps[1], enabled: true, command: 'actions' },
    ],
  };
  const result = applyPixelAction(source, 1, 1, runnable);
  assert.deepEqual([...result.pixels], [47, 47, 47, 255]);
  assert.deepEqual({ applied: result.applied, skipped: result.skipped }, { applied: 1, skipped: 1 });
  assert.deepEqual([...source], [20, 40, 80, 255]);
});

void test('unsafe automation files fail closed', () => {
  assert.throws(
    () => parseActionSet(JSON.stringify({ format: 'librelayer-action-set', version: 1 })),
    /invalid/i,
  );
  assert.throws(
    () => parseDroplet(JSON.stringify({ format: 'librelayer-droplet', version: 2 })),
    /invalid|unsupported/i,
  );
});
