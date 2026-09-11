# Security policy

LibreLayer is a browser-local image editor. Projects remain on the user's device unless the user explicitly exports or shares them.

## Supported version

Security fixes are applied to the current `main` branch and the latest published release. Older snapshots are not supported.

## Reporting a vulnerability

Please use GitHub's private vulnerability-reporting feature for the LibreLayer repository. Do not open a public issue for a suspected vulnerability or include private images, project files, credentials, or exploit details in public reports.

Include the affected version, browser and operating system, reproduction steps, impact, and a minimal non-sensitive test file when one is required. The maintainers will acknowledge the report, reproduce it, and coordinate a fix and disclosure through the private report.

## Security boundaries

- Editing, autosave, recovery, AI-assisted selection, and project encryption execute locally in the browser.
- Imported files are treated as untrusted. Decoders receive file-size and format checks, but complex third-party parsers remain part of the attack surface.
- The File System Access API is used only after an explicit user choice. A remembered handle does not grant silent access after the browser or operating system revokes permission.
- Encrypted project packages use AES-256-GCM with a key derived locally from the supplied password. Forgotten passwords cannot be recovered.
- LibreLayer does not require an account and does not intentionally transmit documents or credentials to a LibreLayer server.

## Dependency policy

Production dependencies are audited before release. Patched versions are applied when available and validated through type, lint, core-test, production-build, and browser smoke-test gates. An upstream advisory without a published patched version is recorded in the release review and must not be represented as resolved.
