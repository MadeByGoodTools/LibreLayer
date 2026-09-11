# Security review — 2026-09-11

## Scope

This review covers the LibreLayer 0.1.0 release-candidate source tree, production dependencies, browser storage and file access, user-provided markup paths, encryption boundaries, and release checks.

## Completed checks

- Updated React, React DOM, and React Server Components to 19.2.8 and Vite to 8.0.16.
- Overrode transitive `adm-zip`, `esbuild`, and `sharp` dependencies to published patched versions.
- Searched the tracked source for credential-shaped values, unsafe dynamic execution, unsanitized HTML injection, and outbound request code.
- Reviewed the shared chart style injection. Its CSS is assembled from application-owned chart configuration; LibreLayer does not place imported document text into that path.
- Confirmed local-only project persistence and explicit user-mediated file access in the documented storage model.
- Required TypeScript, lint, deterministic core tests, production build, and a browser smoke test after dependency changes.

## Open upstream finding

`pnpm audit --prod` reports two high-severity denial-of-service advisories for `image-size@2.0.2`, inherited through `vinext`. Both advisories identify `2.0.3` as the patched release, but `2.0.3` is not available from the npm registry at the time of review. LibreLayer does not directly call `image-size`; exposure is limited to framework-controlled asset inspection. The dependency must be upgraded as soon as a compatible patched release is published, and untrusted server-side image inspection must not be added while this finding remains.

## Threat boundaries and residual risk

- Image, PSD, PDF, TIFF, RAW, LUT, workflow, and project decoders process attacker-controlled files locally. Size limits and format validation reduce risk but cannot eliminate decoder vulnerabilities.
- Browser storage can be cleared by the user, browser, operating system, or storage pressure. Local persistence is not a backup.
- File handles persist only where supported and permissions may be revoked externally.
- Project encryption protects package contents when a strong password is used; it does not protect screenshots, exported images, browser memory, or an already-unlocked session.
- AI-assisted operations are local and deterministic where documented; model and decoder dependencies remain part of the supply chain.

## Release disposition

The directly actionable dependency findings are remediated and validated. The unpublished upstream `image-size` fix prevents declaring a zero-finding dependency audit. This candidate may be evaluated locally, but final release signoff requires the remaining upstream fix or a framework update that removes the vulnerable path, plus independent beta review.
