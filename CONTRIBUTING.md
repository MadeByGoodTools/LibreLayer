# Contributing to LibreLayer

Thanks for helping make professional image editing more accessible.

## Before opening a change

Use an issue for a large feature or behavior change so its editing model, file compatibility, and browser constraints can be agreed on first. Security issues belong in a private vulnerability report, not a public issue.

## Local setup

LibreLayer requires Node.js 22.13 or newer and pnpm.

```bash
pnpm install
pnpm dev
```

## Definition of done

A workflow is complete only when its visible control performs the real edit and it includes:

- undo and redo;
- project save and restore where applicable;
- useful empty-state and failure messages;
- keyboard and accessible names for core controls;
- focused automated tests for deterministic logic;
- a successful production build and browser smoke test.

Do not check an item in `LIBRELAYER-10-ROADMAP.md` for a placeholder, disabled button, visual-only mock, or partially wired control.

## Required checks

Run these before requesting review:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test:core
pnpm build
pnpm test:release
```

Run `pnpm test:release` before requesting release-candidate review. It is the same full gate used on pull requests and pushes to `main`.

For pixel-output changes, add stable fixtures that cover transparent and partial-alpha pixels as well as edge cases specific to the operation. Avoid timing-sensitive snapshots and environment-dependent output.

## Product principles

- Preserve layered, non-destructive editing whenever the operation supports it.
- Keep projects device-local unless the user explicitly exports or shares.
- Keep familiar desktop-editor shortcuts while avoiding browser shortcut conflicts.
- Prefer compact, calm layouts that fit the workspace without unnecessary page scrolling.
- Never silently flatten unsupported data during import or export; warn clearly and preserve originals when possible.

## Pull requests

Describe the user-visible result, tests run, browsers checked, file-format implications, and known limitations. Keep unrelated formatting or generated-file changes out of the pull request.
