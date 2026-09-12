# LibreLayer 0.5 — Deep Canvas Update

Released September 12, 2026. LibreLayer 0.5 is the largest pre-1.0 release of the browser-local layered image editor. The Deep Canvas Update focuses on high-depth color, HDR rendering, nondestructive editing, local recovery, performance, and dependable release gates. Version 1.0 remains reserved for completion of the professional-parity roadmap; 0.5 is not represented as full Photoshop parity or independent production certification.

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
- An explicit-trust local scripting console with a disposable two-second-watchdog worker, registered-command-only output, seeded deterministic traces, integrity-checked replay, portable script/trace files, and the same validator/compiler in an optional repository CLI.
- A measured Print Studio with persistent paper and layout preferences, custom sizing and placement, bleed and production marks, open-document contact sheets, proof metadata, PNG proof export, and browser print handoff.
- Native 8-bit integer, 16-bit integer, 16-bit half-float, and 32-bit float RGB working documents with an explicit per-layer high-depth backing store, transactional depth conversion, undo/redo, recovery, copied-layer and embedded-Smart-Object retention, native-project round-trip, and direct high-depth image/canvas resizing.
- Float16 intermediate rendering across the complete layer/group/mask/adjustment/Smart Object/Smart Filter/effect compositor on supported browsers, including precision-preserving Copy/Paste, Copy Merged, Merge Down, Merge Visible, Flatten, History layer restore, and final-only scene-to-display conversion.
- Scene-linear Float32 HDR Merge with unclipped high-depth document storage, Float16 extended-range preview on compatible HDR displays, a deterministic SDR fallback, and a highlight clipping map.
- PSD/PSB, image, TIFF, PDF, RAW, editable project, encrypted project, and web-export workflows with format-specific limitations documented in the format matrix.
- Device-local autosave, recovery, preferences, remembered save handles where the browser permits them, configurable history compaction, and large-document reporting.

## Privacy

Documents and AI-assisted editing stay on the device. The application does not require an account. Files leave the browser only when the user explicitly exports or shares them.

## Validation status

- Deterministic core editing tests, TypeScript validation, lint, and production builds are required for every release candidate.
- Browser smoke testing covers project creation, editing, undo/redo, save/recovery, settings persistence, and representative advanced workspaces.
- The two `image-size@2.0.2` denial-of-service paths inherited from `vinext` are removed from the installed graph. LibreLayer pins the API-compatible `image-size-next@2.1.1` security fork, whose ICNS, JPEG XL, and HEIF guards are covered by local malformed-container regression tests. The production dependency audit reports zero known vulnerabilities.
- Independent professional-editor beta and release-candidate signoff remains outstanding.

## Known limitations

- Some advanced Photoshop workflows remain open in `LIBRELAYER-10-ROADMAP.md`; a checked item means the complete behavior has been implemented and verified, not simply displayed.
- PSD/PSB round trips can preserve more data than the browser can edit, but unsupported constructs are reported rather than silently promised as editable.
- Browser memory, GPU, file-system APIs, and color-management behavior vary by platform. Very large documents should be tested on the intended production device.
- The browser canvas remains the display proxy. Browsers without Float16 Canvas support use an explicit 8-bit render fallback, and filters or exchange formats documented as display-rendered can quantize changed output. The native project remains the authoritative high-depth master.
- Production JavaScript chunks still exceed the preferred 500 kB warning threshold and require continued lazy-loading work.

See the user manual, format matrix, privacy model, migration policy, and roadmap for detailed behavior.
