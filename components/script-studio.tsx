'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  createLocalScript,
  validateLocalScript,
  validateLocalScriptTrace,
  type LocalScriptTrace,
} from '@/lib/local-script';
import {
  runLocalScriptJob,
  ScriptCancelledError,
  ScriptWatchdogError,
} from '@/lib/local-script-job';
import { resolveRecipeFeature, type EditRecipeStep } from '@/lib/edit-recipe';
import type { SuiteFeature, SuiteOptions } from '@/lib/pro-suite';

const SOURCE_KEY = 'librelayer-local-script-v1';
const TRACE_KEY = 'librelayer-local-script-trace-v1';
const SAMPLE_SOURCE = `// Build a validated, replayable edit trace.
run('auto-contrast', { amount: 62 });
run('smart-sharpen', { amount: 38, secondary: 24 });`;

const downloadJson = (name: string, value: unknown) => {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
      type: 'application/json',
    }),
    url = URL.createObjectURL(blob),
    link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export function ScriptStudio({
  defaults,
  onRun,
}: {
  defaults: SuiteOptions;
  onRun: (feature: SuiteFeature, options: SuiteOptions) => Promise<void> | void;
}) {
  const fileRef = useRef<HTMLInputElement>(null),
    controllerRef = useRef<AbortController | null>(null),
    [name, setName] = useState('Local finishing pass'),
    [seed, setSeed] = useState(1),
    [source, setSource] = useState(SAMPLE_SOURCE),
    [trusted, setTrusted] = useState(false),
    [trace, setTrace] = useState<LocalScriptTrace | null>(null),
    [running, setRunning] = useState(false),
    [progress, setProgress] = useState(0),
    [status, setStatus] = useState(
      'Review the script and explicitly trust it before running.',
    );
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SOURCE_KEY);
      if (saved) {
        const script = validateLocalScript(JSON.parse(saved));
        setName(script.name);
        setSeed(script.seed);
        setSource(script.source);
      }
      const savedTrace = localStorage.getItem(TRACE_KEY);
      if (savedTrace)
        setTrace(validateLocalScriptTrace(JSON.parse(savedTrace)));
    } catch {
      localStorage.removeItem(SOURCE_KEY);
      localStorage.removeItem(TRACE_KEY);
    }
  }, []);
  const persistScript = () => {
      const script = createLocalScript(name, seed, source);
      localStorage.setItem(SOURCE_KEY, JSON.stringify(script));
      return script;
    },
    applyTrace = async (nextTrace: LocalScriptTrace) => {
      const validated = validateLocalScriptTrace(nextTrace);
      setRunning(true);
      setProgress(0);
      try {
        for (let index = 0; index < validated.steps.length; index++) {
          const step = validated.steps[index];
          await onRun(resolveRecipeFeature(step.command), step.options);
          setProgress(Math.round(((index + 1) / validated.steps.length) * 100));
        }
        setStatus(
          `${validated.steps.length} deterministic steps applied · ${validated.traceHash}`,
        );
      } finally {
        setRunning(false);
      }
    },
    compile = async () => {
      if (!trusted) {
        setStatus(
          'Review the script and check “I trust this local script” first.',
        );
        return;
      }
      const controller = new AbortController();
      controllerRef.current = controller;
      setRunning(true);
      setProgress(0);
      setStatus('Compiling in a disposable headless worker…');
      try {
        const nextTrace = await runLocalScriptJob(persistScript(), defaults, {
          signal: controller.signal,
          timeoutMs: 2000,
          onProgress: setProgress,
        });
        localStorage.setItem(TRACE_KEY, JSON.stringify(nextTrace));
        setTrace(nextTrace);
        setStatus(
          `${nextTrace.steps.length} validated steps compiled · trace ${nextTrace.traceHash}`,
        );
      } catch (error) {
        setStatus(
          error instanceof ScriptCancelledError
            ? 'Script compilation cancelled; no editor commands ran.'
            : error instanceof ScriptWatchdogError
              ? 'Script stopped by the two-second watchdog; no editor commands ran.'
              : error instanceof Error
                ? error.message
                : 'The local script failed safely.',
        );
      } finally {
        controllerRef.current = null;
        setRunning(false);
      }
    };
  const changeSource = (value: string) => {
    setSource(value);
    setTrusted(false);
  };
  return (
    <section className="script-studio" aria-labelledby="script-studio-title">
      <div className="script-studio-heading">
        <div>
          <strong id="script-studio-title">Trusted local script console</strong>
          <span>
            Headless worker · deterministic trace · no direct document access
          </span>
        </div>
        <div>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Open script / trace
          </Button>
          <input
            ref={fileRef}
            hidden
            type="file"
            accept=".librescript,.libretrace,application/json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              try {
                if (file.size > 1_000_000)
                  throw new Error(
                    'Script and trace files must be smaller than 1 MB.',
                  );
                const value = JSON.parse(await file.text());
                if (value?.format === 'librelayer-script-trace') {
                  const nextTrace = validateLocalScriptTrace(value);
                  setTrace(nextTrace);
                  localStorage.setItem(TRACE_KEY, JSON.stringify(nextTrace));
                  setStatus(`Verified replay trace ${nextTrace.traceHash}`);
                } else {
                  const script = validateLocalScript(value);
                  setName(script.name);
                  setSeed(script.seed);
                  setSource(script.source);
                  setTrusted(false);
                  localStorage.setItem(SOURCE_KEY, JSON.stringify(script));
                  setStatus('Script opened. Review it before granting trust.');
                }
              } catch (error) {
                setStatus(
                  error instanceof Error
                    ? error.message
                    : 'The file is invalid.',
                );
              }
            }}
          />
        </div>
      </div>
      <div className="script-metadata">
        <label>
          Name
          <input
            value={name}
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          Deterministic seed
          <input
            type="number"
            min={0}
            max={4294967295}
            value={seed}
            onChange={(event) => {
              setSeed(
                Math.max(0, Math.min(4294967295, Number(event.target.value))),
              );
              setTrusted(false);
            }}
          />
        </label>
      </div>
      <label className="script-editor-label">
        JavaScript command source
        <textarea
          value={source}
          spellCheck={false}
          onChange={(event) => changeSource(event.target.value)}
        />
      </label>
      <div className="script-help">
        <code>run(command, options)</code>
        <code>repeat(0–50, callback)</code>
        <code>when(condition, callback)</code>
        <code>random()</code>
        <code>log(value)</code>
      </div>
      <label className="script-trust">
        <input
          type="checkbox"
          checked={trusted}
          onChange={(event) => setTrusted(event.target.checked)}
        />
        I reviewed and trust this local script
      </label>
      <div className="script-actions">
        <Button disabled={running || !trusted} onClick={() => void compile()}>
          Compile trace
        </Button>
        <Button
          disabled={running || !trace}
          onClick={() => trace && void applyTrace(trace)}
        >
          Replay trace{trace ? ` (${trace.steps.length})` : ''}
        </Button>
        <Button
          variant="secondary"
          disabled={running}
          onClick={() => {
            try {
              downloadJson(
                `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'script'}.librescript`,
                persistScript(),
              );
              setStatus('Portable local script exported');
            } catch (error) {
              setStatus(
                error instanceof Error ? error.message : 'Export failed.',
              );
            }
          }}
        >
          Export script
        </Button>
        <Button
          variant="secondary"
          disabled={!trace || running}
          onClick={() =>
            trace &&
            downloadJson(
              `${trace.scriptName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.libretrace`,
              trace,
            )
          }
        >
          Export trace
        </Button>
        {running ? (
          <Button
            variant="destructive"
            onClick={() => controllerRef.current?.abort()}
          >
            Cancel
          </Button>
        ) : null}
        <span>{progress}%</span>
      </div>
      {trace ? (
        <ol className="script-trace">
          {trace.steps.map((step: EditRecipeStep, index) => (
            <li key={`${step.command}:${index}`}>
              <strong>
                {index + 1}. {resolveRecipeFeature(step.command).label}
              </strong>
              <span>
                {step.options.amount}% · {step.options.secondary}%
              </span>
            </li>
          ))}
        </ol>
      ) : null}
      <output className="script-status" aria-live="polite">
        {status}
      </output>
    </section>
  );
}
