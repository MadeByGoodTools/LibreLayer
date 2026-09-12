# Trusted local scripting

LibreLayer local scripts automate registered editor commands without receiving document pixels, DOM access, browser storage, local file handles, or an application object. Open **Filter → Professional Studio → Automation & production → Scripts and filter plug-ins** to jump to the Trusted local script console.

## Trust and execution

Scripts are user-authored or user-reviewed JavaScript command source. LibreLayer never runs an opened script automatically. Changing its source or deterministic seed clears the trust checkbox; the user must review the code and select **I reviewed and trust this local script** before compiling it.

Compilation occurs in a new disposable worker. The worker is terminated on cancellation, an error, or after a two-second watchdog. It can only return up to 100 validated Professional Studio command records; it cannot mutate the document. The user then chooses **Replay trace** to run those records through the normal editor handlers, producing the same per-step Undo/Redo history as manual use.

The source validator rejects direct network, DOM, storage, module, process, dynamic-code, clock, performance, and cryptographic APIs. The supported globals are:

- `run(command, options)` adds a registered command. Options may contain bounded `amount`, `secondary`, `color`, and `text` values.
- `repeat(count, callback)` repeats at most 50 times.
- `when(condition, callback)` conditionally adds steps.
- `random()` returns a deterministic seeded value from 0 up to but not including 1.
- `log(value)` records up to 50 bounded messages in the trace.
- `Math` exposes only deterministic arithmetic helpers; its `random()` uses the same seeded generator.

The trust gate remains important: this is a deliberately useful JavaScript subset backed by source validation and worker isolation, not a formal capability-secure JavaScript virtual machine. Only run code you have reviewed.

## Portable scripts and deterministic traces

**Export script** creates a `.librescript` file containing the versioned source, name, and seed. **Compile trace** creates a `.libretrace` record containing the source hash, seed, validated normalized steps, bounded logs, and an integrity hash. Reopening or replaying a changed trace fails closed.

Example source:

```js
const strength = Math.round(random() * 30) + 45;
run('auto-contrast', { amount: strength });
run('smart-sharpen', { amount: 38, secondary: 24 });
```

## Optional local CLI

The repository includes the same validator/compiler for local automation and CI:

```bash
pnpm script:local validate workflow.librescript
pnpm script:local compile workflow.librescript workflow.libretrace
pnpm script:local replay workflow.libretrace verified-steps.json
```

`validate` reports bounded metadata, `compile` executes the trusted source and writes an integrity-checked deterministic trace, and `replay` verifies trace integrity and writes the exact normalized command sequence. Omitting the output path prints JSON to standard output. The CLI does not open documents or silently write image files.
