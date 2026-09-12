import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import {
  createLocalScript,
  executeLocalScript,
  validateLocalScript,
  validateLocalScriptTrace,
} from '../lib/local-script.ts';

void test('local scripts compile to deterministic validated traces', async () => {
  const script = createLocalScript(
      'Repeatable finish',
      1234,
      `
        const strength = Math.round(random() * 100);
        run('auto-contrast', { amount: strength });
        when(strength > 20, () => run('smart-sharpen', { amount: 35 }));
        repeat(2, (index) => log('pass', index));
      `,
    ),
    first = await executeLocalScript(script),
    second = await executeLocalScript(script);
  assert.deepEqual(first, second);
  assert.equal(first.steps.length, 2);
  assert.equal(first.logs.length, 2);
  assert.deepEqual(validateLocalScriptTrace(first), first);
});

void test('local scripts reject direct browser, network, and dynamic code access', () => {
  for (const source of [
    `fetch('https://example.com')`,
    `document.body.textContent = 'x'`,
    `globalThis['location']`,
    `new Function('return 1')()`,
    `run.constructor('return 1')()`,
  ])
    assert.throws(
      () => createLocalScript('Unsafe', 1, source),
      /unavailable browser, network, storage, or dynamic-code API/,
    );
});

void test('generated commands and trace integrity fail closed', async () => {
  await assert.rejects(
    executeLocalScript(
      createLocalScript('Unknown command', 1, `run('not-a-command')`),
    ),
    /unsupported command/,
  );
  const trace = await executeLocalScript(
    createLocalScript('One step', 1, `run('auto-color')`),
  );
  assert.throws(
    () =>
      validateLocalScriptTrace({
        ...trace,
        steps: [
          {
            ...trace.steps[0],
            options: { ...trace.steps[0].options, amount: 40 },
          },
        ],
      }),
    /changed after it was generated/,
  );
});

void test('script documents are bounded and versioned', () => {
  const script = validateLocalScript({
    format: 'librelayer-script',
    version: 1,
    name: 'Bounded',
    seed: 0xffffffff,
    source: `run('auto-color')`,
  });
  assert.equal(script.seed, 0xffffffff);
  assert.throws(() => validateLocalScript({ ...script, seed: -1 }), /seed/);
  assert.throws(
    () => validateLocalScript({ ...script, version: 2 }),
    /unsupported/,
  );
});

void test('the optional local CLI validates and compiles portable scripts', () => {
  const validated = spawnSync(
      process.execPath,
      [
        'scripts/librelayer-script.ts',
        'validate',
        'tests/fixtures/finish.librescript',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    ),
    compiled = spawnSync(
      process.execPath,
      [
        'scripts/librelayer-script.ts',
        'compile',
        'tests/fixtures/finish.librescript',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );
  assert.equal(validated.status, 0, validated.stderr);
  assert.equal(JSON.parse(validated.stdout).valid, true);
  assert.equal(compiled.status, 0, compiled.stderr);
  const trace = validateLocalScriptTrace(JSON.parse(compiled.stdout));
  assert.equal(trace.steps.length, 2);
  assert.equal(trace.traceHash, '56800714');
});
