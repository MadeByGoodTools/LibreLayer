import { validRecipeStep, type EditRecipeStep } from './edit-recipe.ts';
import type { SuiteOptions } from './pro-suite.ts';

export const LOCAL_SCRIPT_FORMAT = 'librelayer-script';
export const LOCAL_SCRIPT_TRACE_FORMAT = 'librelayer-script-trace';
export const LOCAL_SCRIPT_VERSION = 1;
export const MAX_LOCAL_SCRIPT_BYTES = 64 * 1024;
export const MAX_LOCAL_SCRIPT_STEPS = 100;

export type LocalScriptDocument = {
  format: typeof LOCAL_SCRIPT_FORMAT;
  version: typeof LOCAL_SCRIPT_VERSION;
  name: string;
  seed: number;
  source: string;
};

export type LocalScriptTrace = {
  format: typeof LOCAL_SCRIPT_TRACE_FORMAT;
  version: typeof LOCAL_SCRIPT_VERSION;
  scriptName: string;
  sourceHash: string;
  seed: number;
  steps: EditRecipeStep[];
  logs: string[];
  traceHash: string;
};

const FORBIDDEN_SOURCE =
  /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|navigator|location|indexedDB|caches|postMessage|importScripts|self|globalThis|window|document|Function|eval|constructor|process|require|module|Date|performance|crypto)\b|\bimport\s*\(/;

const hashText = (value: string) => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const normalizedName = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 120)
    throw new Error('A local script name must be 1–120 characters.');
  return value.trim();
};

const normalizedSeed = (value: unknown) => {
  if (
    !Number.isInteger(value) ||
    Number(value) < 0 ||
    Number(value) > 0xffffffff
  )
    throw new Error(
      'A local script seed must be an integer from 0 to 4,294,967,295.',
    );
  return Number(value);
};

const validateSource = (source: unknown) => {
  if (typeof source !== 'string' || !source.trim())
    throw new Error('Enter JavaScript commands before running the script.');
  if (new TextEncoder().encode(source).byteLength > MAX_LOCAL_SCRIPT_BYTES)
    throw new Error('Local scripts must be 64 KB or smaller.');
  if (FORBIDDEN_SOURCE.test(source))
    throw new Error(
      'The script uses an unavailable browser, network, storage, or dynamic-code API.',
    );
  return source;
};

export const validateLocalScript = (value: unknown): LocalScriptDocument => {
  if (!value || typeof value !== 'object')
    throw new Error('The local script must be a JSON object.');
  const input = value as Record<string, unknown>;
  if (
    input.format !== LOCAL_SCRIPT_FORMAT ||
    input.version !== LOCAL_SCRIPT_VERSION
  )
    throw new Error('This LibreLayer local script format is unsupported.');
  return {
    format: LOCAL_SCRIPT_FORMAT,
    version: LOCAL_SCRIPT_VERSION,
    name: normalizedName(input.name),
    seed: normalizedSeed(input.seed),
    source: validateSource(input.source),
  };
};

export const createLocalScript = (
  name: string,
  seed: number,
  source: string,
): LocalScriptDocument =>
  validateLocalScript({
    format: LOCAL_SCRIPT_FORMAT,
    version: LOCAL_SCRIPT_VERSION,
    name,
    seed,
    source,
  });

const normalizeOptions = (
  value: unknown,
  defaults: SuiteOptions,
): SuiteOptions => {
  const input = value && typeof value === 'object' ? value : {},
    candidate = input as Partial<SuiteOptions>,
    bounded = (next: unknown, fallback: number) =>
      Number.isFinite(next)
        ? Math.max(0, Math.min(100, Number(next)))
        : fallback;
  return {
    amount: bounded(candidate.amount, defaults.amount),
    secondary: bounded(candidate.secondary, defaults.secondary),
    color:
      typeof candidate.color === 'string' &&
      /^#[0-9a-f]{6}$/i.test(candidate.color)
        ? candidate.color
        : defaults.color,
    text:
      typeof candidate.text === 'string'
        ? candidate.text.slice(0, 160)
        : defaults.text,
  };
};

const safeMath = (random: () => number) =>
  Object.freeze({
    abs: Math.abs,
    ceil: Math.ceil,
    floor: Math.floor,
    max: Math.max,
    min: Math.min,
    pow: Math.pow,
    random,
    round: Math.round,
    sign: Math.sign,
    sqrt: Math.sqrt,
    trunc: Math.trunc,
  });

const traceHash = (
  trace: Omit<LocalScriptTrace, 'format' | 'version' | 'traceHash'>,
) => hashText(JSON.stringify(trace));

export const executeLocalScript = async (
  documentValue: unknown,
  defaults: SuiteOptions = {
    amount: 50,
    secondary: 40,
    color: '#6d8cff',
    text: '',
  },
  onProgress?: (progress: number) => void,
): Promise<LocalScriptTrace> => {
  const script = validateLocalScript(documentValue),
    steps: EditRecipeStep[] = [],
    logs: string[] = [];
  let randomState = script.seed >>> 0;
  const random = () => {
      randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
      return randomState / 0x100000000;
    },
    run = (command: string, options?: Partial<SuiteOptions>) => {
      if (steps.length >= MAX_LOCAL_SCRIPT_STEPS)
        throw new Error(
          'A local script can generate at most 100 editing steps.',
        );
      const step: EditRecipeStep = {
        command,
        options: normalizeOptions(options, defaults),
      };
      if (!validRecipeStep(step))
        throw new Error(
          `The script requested an unsupported command: ${command}`,
        );
      steps.push(step);
      onProgress?.(Math.min(95, steps.length));
      return steps.length;
    },
    repeat = (count: number, callback: (index: number) => void) => {
      if (!Number.isInteger(count) || count < 0 || count > 50)
        throw new Error('repeat() accepts an integer from 0 to 50.');
      if (typeof callback !== 'function')
        throw new Error('repeat() requires a callback.');
      for (let index = 0; index < count; index++) callback(index);
    },
    when = (condition: boolean, callback: () => void) => {
      if (typeof callback !== 'function')
        throw new Error('when() requires a callback.');
      if (condition) callback();
    },
    log = (...values: unknown[]) => {
      if (logs.length < 50)
        logs.push(
          values
            .map((value) =>
              typeof value === 'string' ? value : JSON.stringify(value),
            )
            .join(' ')
            .slice(0, 240),
        );
    };
  // oxlint-disable-next-line typescript/no-implied-eval -- Explicitly trusted source is validated and the browser invokes this compiler only inside a disposable watchdog worker.
  const execute = new Function(
    'run',
    'repeat',
    'when',
    'random',
    'log',
    'Math',
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'EventSource',
    'navigator',
    'location',
    'indexedDB',
    'caches',
    'postMessage',
    'importScripts',
    'self',
    'globalThis',
    'window',
    'document',
    'process',
    'require',
    'module',
    'Date',
    'performance',
    'crypto',
    `"use strict"; return (async () => { ${script.source}\n })();`,
  );
  await execute(
    Object.freeze(run),
    Object.freeze(repeat),
    Object.freeze(when),
    Object.freeze(random),
    Object.freeze(log),
    safeMath(random),
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
  );
  if (!steps.length)
    throw new Error('The script completed without requesting an editing step.');
  const unsigned = {
    scriptName: script.name,
    sourceHash: hashText(script.source),
    seed: script.seed,
    steps: steps.map((step) => ({
      command: step.command,
      options: { ...step.options },
    })),
    logs: [...logs],
  };
  onProgress?.(100);
  return {
    format: LOCAL_SCRIPT_TRACE_FORMAT,
    version: LOCAL_SCRIPT_VERSION,
    ...unsigned,
    traceHash: traceHash(unsigned),
  };
};

export const validateLocalScriptTrace = (value: unknown): LocalScriptTrace => {
  if (!value || typeof value !== 'object')
    throw new Error('The replay trace must be a JSON object.');
  const trace = value as Partial<LocalScriptTrace>;
  if (
    trace.format !== LOCAL_SCRIPT_TRACE_FORMAT ||
    trace.version !== LOCAL_SCRIPT_VERSION ||
    typeof trace.scriptName !== 'string' ||
    !trace.scriptName.trim() ||
    trace.scriptName.length > 120 ||
    typeof trace.sourceHash !== 'string' ||
    !/^[0-9a-f]{8}$/.test(trace.sourceHash) ||
    !Number.isInteger(trace.seed) ||
    Number(trace.seed) < 0 ||
    Number(trace.seed) > 0xffffffff ||
    !Array.isArray(trace.steps) ||
    !trace.steps.length ||
    trace.steps.length > MAX_LOCAL_SCRIPT_STEPS ||
    !trace.steps.every(validRecipeStep) ||
    !Array.isArray(trace.logs) ||
    trace.logs.length > 50 ||
    trace.logs.some((log) => typeof log !== 'string' || log.length > 240) ||
    typeof trace.traceHash !== 'string'
  )
    throw new Error('This LibreLayer replay trace is invalid or unsupported.');
  const unsigned = {
    scriptName: trace.scriptName.trim(),
    sourceHash: trace.sourceHash,
    seed: Number(trace.seed),
    steps: trace.steps.map((step) => ({
      command: step.command,
      options: { ...step.options },
    })),
    logs: [...trace.logs],
  };
  if (trace.traceHash !== traceHash(unsigned))
    throw new Error('The replay trace changed after it was generated.');
  return {
    format: LOCAL_SCRIPT_TRACE_FORMAT,
    version: LOCAL_SCRIPT_VERSION,
    ...unsigned,
    traceHash: trace.traceHash,
  };
};
