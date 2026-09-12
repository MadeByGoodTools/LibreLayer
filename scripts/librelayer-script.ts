#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  executeLocalScript,
  validateLocalScript,
  validateLocalScriptTrace,
} from '../lib/local-script.ts';

const usage = () => {
  console.error(
    'Usage: pnpm script:local <validate|compile|replay> <input> [output]',
  );
  process.exitCode = 2;
};

const [, , command, inputName, outputName] = process.argv;
if (
  !command ||
  !inputName ||
  !['validate', 'compile', 'replay'].includes(command)
)
  usage();
else {
  try {
    const input = JSON.parse(readFileSync(resolve(inputName), 'utf8'));
    let result: unknown;
    if (command === 'validate') {
      const script = validateLocalScript(input);
      result = {
        valid: true,
        name: script.name,
        seed: script.seed,
        sourceBytes: new TextEncoder().encode(script.source).byteLength,
      };
    } else if (command === 'compile') result = await executeLocalScript(input);
    else {
      const trace = validateLocalScriptTrace(input);
      result = {
        valid: true,
        traceHash: trace.traceHash,
        scriptName: trace.scriptName,
        seed: trace.seed,
        steps: trace.steps,
      };
    }
    const json = `${JSON.stringify(result, null, 2)}\n`;
    if (outputName) writeFileSync(resolve(outputName), json, 'utf8');
    else process.stdout.write(json);
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : 'Local script failed.',
    );
    process.exitCode = 1;
  }
}
