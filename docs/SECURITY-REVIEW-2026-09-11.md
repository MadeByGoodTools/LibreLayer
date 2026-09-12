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

## Image parser remediation

The published `image-size@2.0.2` dependency inherited through `vinext` contains zero-length ICNS and zero-size JPEG XL/HEIF parser denial-of-service paths, and no fixed release exists under that package name. The workspace therefore removes that transitive edge and pins `image-size` to the API-compatible `image-size-next@2.1.1` security fork. The lockfile records the registry integrity hash, pnpm's supply-chain policy check passes, and local regression fixtures verify that all three malformed containers terminate while normal PNG metadata remains compatible. `pnpm audit --prod` now reports zero known vulnerabilities.

## Threat boundaries and residual risk

- Image, PSD, PDF, TIFF, RAW, LUT, workflow, and project decoders process attacker-controlled files locally. Size limits and format validation reduce risk but cannot eliminate decoder vulnerabilities.
- Browser storage can be cleared by the user, browser, operating system, or storage pressure. Local persistence is not a backup.
- File handles persist only where supported and permissions may be revoked externally.
- Project encryption protects package contents when a strong password is used; it does not protect screenshots, exported images, browser memory, or an already-unlocked session.
- AI-assisted operations are local and deterministic where documented; model and decoder dependencies remain part of the supply chain.

## Release disposition

The directly actionable dependency findings are remediated and validated, including the inherited image-parser paths. Automated technical gates can now produce a release candidate with a zero-finding production dependency audit. Independent beta review and release-candidate signoff remain required before representing the build as professionally certified.
