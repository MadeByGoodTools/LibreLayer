# LibreLayer 0.1.0 release candidate

LibreLayer 0.1.0 is the first open release candidate of the browser-local layered image editor. It is suitable for evaluation and contribution, but it is not yet represented as full Photoshop parity or independently production-certified.

## Editing highlights

- Layered pixel, text, shape, fill, adjustment, Smart Object, Smart Filter, mask, path, channel, group, clipping, linking, and effect workflows.
- High-precision combined adjustments, live histograms, per-channel levels and curves, advanced color controls, 3D LUTs, soft proofing, scopes, and gamut warnings.
- Advanced selections, Select and Mask, browser-local subject-region assistance, Content-Aware Fill, retouching, clone sources, painting dynamics, symmetry, and history brushes.
- Batched WebGL2 subpixel painting for standard round Brush and Eraser strokes, with bounded dirty tiles and an automatic Canvas fallback.
- Dedicated live Liquify, Adaptive Wide Angle, and Vanishing Point workspaces, including freeze/thaw, face controls, reusable meshes, optical correction, and draggable projective planes.
- Camera Raw detail and optics controls with independent luminance/chroma denoise, hot-pixel and banding repair, metadata-matched local lens profiles, distortion, vignette, chromatic-aberration, defringe, and RAW sharpening.
- Persisted Camera Raw decode recipes with seven LibRaw interpolation modes, camera/embedded-DNG profile paths, and as-shot, automatic, daylight, or tungsten white-balance sources that reprocess the retained sensor file.
- Importable and exportable `.libreRAW.json` sidecars that validate every RAW setting before use and never contain image pixels.
- Sequential local Camera Raw batch development: the current recipe processes one selected source at a time, reports progress and individual failures, and can stop safely between stages.
- Editable, persistent Action sets with conditional steps, portable set/droplet recipes, and a sequential local Image Processor with output sizing, format, quality, progress, failure isolation, and safe stopping.
- Cancelable background-worker Auto-align, Auto-Blend, focus stack, HDR merge, and five statistical image-stack modes; successful composites open as new editable documents while failures leave sources untouched.
- Persistent local CSV/JSON datasets with editable text-placeholder variants, single-ZIP layer/artboard assets, captioned contact sheets, and content-registered seam-feathered panoramas.
- A browser-local `.libreplugin` studio with semantic-version upgrades, explicit permission display, declarative persistent panels, restricted JavaScript expressions, worker-isolated WebAssembly/CPU filters, and bounded built-in exporters.
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
