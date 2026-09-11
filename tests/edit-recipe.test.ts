import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEditRecipe,
  parseEditRecipe,
  planLocalEdit,
  resolveRecipeFeature,
} from '../lib/edit-recipe.ts';

void test('an open editing workflow round-trips with bounded options', () => {
  const recipe = createEditRecipe('Portrait finish', [
    {
      command: 'auto-contrast',
      options: {
        amount: 72,
        secondary: 40,
        color: '#6d8cff',
        text: 'Portrait finish',
      },
    },
  ]);
  const parsed = parseEditRecipe(JSON.stringify(recipe));
  assert.equal(parsed.name, 'Portrait finish');
  assert.equal(parsed.createdAt, recipe.createdAt);
  assert.equal(parsed.steps.length, 1);
  assert.equal(
    resolveRecipeFeature(parsed.steps[0].command).label,
    'Auto Contrast',
  );
});

void test('the local planner turns plain language into bounded real commands', () => {
  const steps = planLocalEdit('Recover highlights, reduce noise and sharpen', {
    amount: 60,
    secondary: 35,
    color: '#6d8cff',
    text: '',
  });
  assert.deepEqual(
    steps.map((step) => step.command),
    ['shadows-highlights', 'median-dust', 'smart-sharpen'],
  );
  assert.equal(
    steps.every((step) => resolveRecipeFeature(step.command)),
    true,
  );
});

void test('workflow import rejects unknown commands and unsafe values', () => {
  assert.throws(
    () =>
      parseEditRecipe(
        JSON.stringify({
          format: 'librelayer-edit-recipe',
          version: 1,
          name: 'Bad workflow',
          createdAt: new Date().toISOString(),
          steps: [
            {
              command: 'run-arbitrary-code',
              options: {
                amount: 999,
                secondary: 0,
                color: 'javascript:alert(1)',
                text: '',
              },
            },
          ],
        }),
      ),
    /invalid or unsupported/,
  );
});
