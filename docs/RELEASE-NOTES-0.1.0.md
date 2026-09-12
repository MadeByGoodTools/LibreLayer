# LibreLayer 0.1.0 release candidate

LibreLayer 0.1.0 is the first open release candidate of the browser-local layered image editor. It is suitable for evaluation and contribution, but it is not yet represented as full Photoshop parity or independently production-certified.

## Editing highlights

- Layered pixel, text, shape, fill, adjustment, Smart Object, Smart Filter, mask, path, channel, group, clipping, linking, and effect workflows.
- High-precision combined adjustments, live histograms, per-channel levels and curves, advanced color controls, 3D LUTs, soft proofing, scopes, and gamut warnings.
- Advanced selections, Select and Mask, browser-local subject-region assistance, Content-Aware Fill, retouching, clone sources, painting dynamics, symmetry, and history brushes.
- Batched WebGL2 subpixel painting for standard round Brush and Eraser strokes, with bounded dirty tiles and an automatic Canvas fallback.
- PSD/PSB, image, TIFF, PDF, RAW, editable project, encrypted project, and web-export workflows with format-specific limitations documented in the format matrix.
- Device-local autosave, recovery, preferences, remembered save handles where the browser permits them, configurable history compaction, and large-document reporting.

## Privacy

Documents and AI-assisted editing stay on the device. The application does not require an account. Files leave the browser only when the user explicitly exports or shares them.

## Validation status

- Deterministic core editing tests, TypeScript validation, lint, and production builds are required for every release candidate.
- Browser smoke testing covers project creation, editing, undo/redo, save/recovery, settings persistence, and representative advanced workspaces.
- The current dependency audit has no available-fix findings except two `image-size` denial-of-service advisories inherited from `vinext`; the audit names `2.0.3` as patched, but the registry currently publishes only `2.0.2`. LibreLayer does not directly invoke that package. This remains an upstream release blocker to monitor rather than a resolved finding.
- Independent professional-editor beta and release-candidate signoff remains outstanding.

## Known limitations

- Some advanced Photoshop workflows remain open in `LIBRELAYER-10-ROADMAP.md`; a checked item means the complete behavior has been implemented and verified, not simply displayed.
- PSD/PSB round trips can preserve more data than the browser can edit, but unsupported constructs are reported rather than silently promised as editable.
- Browser memory, GPU, file-system APIs, and color-management behavior vary by platform. Very large documents should be tested on the intended production device.
- Production JavaScript chunks still exceed the preferred 500 kB warning threshold and require continued lazy-loading work.

See the user manual, format matrix, privacy model, migration policy, and roadmap for detailed behavior.
