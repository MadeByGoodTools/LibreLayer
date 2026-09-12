# LibreLayer 10/10 completion ledger

This is the release ledger for closing the remaining gap with a professional desktop image editor while keeping LibreLayer browser-local. A feature is checked only when its real operation, undo/redo, project persistence, error handling, automated coverage, and browser QA are complete.

## Release gate

- [ ] Every visible control performs a real operation.
- [ ] Every edit is undoable and redoable.
- [ ] Nondestructive edits remain editable after reopening.
- [ ] Unsupported file content is never silently discarded or flattened.
- [ ] Long operations expose progress and cancellation.
- [ ] Large files do not block the interface.
- [ ] Local and deployed browser workflows pass separately.
- [ ] Chrome, Edge, Safari, and Firefox fallbacks are verified.
- [ ] Accessibility passes keyboard, focus, contrast, and screen-reader checks.
- [ ] Documentation states exact limits and privacy behavior.

## 1. Interface and workflow

- [x] Familiar application menu, toolbar, panels, tabs, status bar, and shortcuts.
- [x] Searchable commands and editable shortcuts.
- [x] Saved panel side, width, visibility, presets, and local preferences.
- [x] Multiple document tabs, fit, 100%, rotation, rulers, guides, and grid.
- [x] Dock, tab-stack, resize, float, collapse, and solo every Layers, Properties, Channels, Paths, and History panel.
- [x] Save, rename, import, export, validate, and reset complete workspace layouts.
- [x] Contextual task bar and complete right-click menus.
- [x] Scrubby labels, direct numeric entry, per-control reset, and fine/coarse modifiers.
- [x] Configurable toolbar and tool groups.
- [x] Interface scaling, light, dark, and high-contrast themes.
- [x] Side-by-side document views with matched zoom, pan, and rotation.

## 2. Layers, masks, and compositing

- [x] Pixel, text, shape, adjustment, Smart Object, and group workflows.
- [x] Raster masks, vector masks, clipping, linking, locking, and nested groups.
- [x] Opacity, fill, common blend modes, Blend If, and layer comps.
- [x] Native editable solid-color, gradient, and pattern fill layers with masks, transforms, and persisted recipes.
- [x] Editable layer effects with alpha contours, synchronized global light, independent scaling, and copy/paste/clear.
- [x] Reference-equation separable and nonseparable blend-mode math with per-layer gamma or linear-light compositing.
- [x] Recursive pass-through/isolated group compositing with shallow/deep knockout and nested clipping-base resolution.
- [x] Mask density, feather, live overlay, direct edge refinement, and independent position, rotation, and two-axis transforms.
- [x] Cross-document layer-tree copying that preserves groups, masks, links, Smart Objects, fills, adjustments, and effects without rasterization.
- [x] Versioned pixel-reference compositing fixtures covering opaque, partial-alpha, transparent, gamma, and linear-light output.

## 3. Adjustments and color grading

- [x] Editable adjustment layers with masks and high-precision combined processing.
- [x] RGB/channel Levels with input, output, gamma, and image eyedroppers.
- [x] RGB/channel multi-point Curves with histogram, overlays, and image targeting.
- [x] Exposure, brightness, contrast, hue, saturation, vibrance, color balance, black-and-white, and photo filter.
- [x] Live preview presets with explicit Apply behavior.
- [x] Importable 3D `.cube` LUTs with live amount and project persistence.
- [x] Waveform, RGB parade, and vectorscope displays.
- [x] Monotonic spline Curves with a direct numeric point editor.
- [x] Freehand Curves with editable-point resampling, adjustable smoothing, and endpoint clipping controls.
- [x] Hue/Saturation controls for six independent color ranges.
- [x] Hue/Saturation on-image color targeting with editable center, range width, and soft falloff controls.
- [x] Full RGB Channel Mixer with output-channel recipes and constants.
- [x] Editable two-color Gradient Map with reverse and live strength.
- [x] Selective Color with nine color/tonal targets, relative/absolute modes, and CMYK recipes.
- [x] Built-in Color Lookup library with four live, adjustable 3D looks.
- [x] Tonal Shadows/Highlights recovery with independent range and color controls.
- [x] Targeted Replace Color with fuzziness, HSL correction, and live amount.
- [x] Browser-local Match Color from a chosen reference image with fade, luminance, intensity, and neutralization.
- [x] Floating-point Reinhard/filmic HDR toning and skin-protected perceptual vibrance.
- [x] Lift/gamma/gain color wheels with independent tonal levels.
- [x] Waveform/parade/vector zoom and trace-brightness controls.
- [x] Captured-reference split and side-by-side comparison with matched zoom, pan, and rotation.

## 4. Selections and masking

- [x] Marquee, lasso, polygonal lasso, Magic Wand, Quick Selection, selection math, feather, and saved selections.
- [x] Browser-local subject/background assistance and editable mask output.
- [x] Ellipse, single-row, single-column, and optimized magnetic-edge selection variants.
- [x] Numeric Transform Selection, Grow, soft Similar and Color Range, Focus Range, and shadows/midtones/highlights luminosity ranges.
- [x] Browser-local Select Subject/People plus Sky, Hair, Skin, Clothing, and detected-object masks.
- [x] Dedicated Select and Mask workspace with Overlay, On Black, On White, Black & White, On Layers, and Onion Skin previews.
- [x] Color-aware Refine Hair and object-bounded Smart Radius refinement.
- [x] Smart Radius, decontamination, live edge controls, and selection, layer-mask, or new-layer-with-mask output choices.
- [x] Deterministic subpixel rectangle and supersampled ellipse coverage with reference tests.

## 5. Painting and retouching

- [x] Brush, pencil, eraser, clone, heal, fill, gradient, smoothing, pressure, tilt, scatter, texture, and mixer controls.
- [ ] GPU subpixel brush renderer with stable low-latency interpolation.
- [x] Complete angle/roundness shape, opacity/flow transfer, dual-brush, hue/color, wet-edge, airbrush, and buildup dynamics with preset round-trip.
- [x] Custom brush tips, ABR import, folders, tags, favorites, and search.
- [x] Mirror/radial symmetry, Pattern Stamp, History Brush, and stylized Art History Brush with real canvas sources.
- [x] Five-slot Clone Source panel with independent source selection and transformable scale, rotation, flip, offset, alignment, and overlay controls.
- [x] Healing, Spot Healing, Patch, Content-Aware Move, Red Eye, Dodge, Burn, Sponge, Blur, Sharpen, and Smudge.
- [x] Sample-all-layers retouching on blank layers and nondestructive frequency-separation stacks that preserve the hidden original.

## 6. Content-aware and distortion

- [x] Content-Aware Fill workspace with editable sampling overlay.
- [x] Auto, rectangular, custom, and all-layer sampling.
- [x] Color, rotation, scale, and mirror adaptation with live preview.
- [x] Detail-weighted Content-Aware Scale with active-selection protection, plus Content-Aware Move.
- [x] Perspective, Puppet, mesh, split, cylindrical, and named Arc, Flag, Fisheye, and Twist preset warps.
- [ ] Vanishing Point and Adaptive Wide Angle workspaces.
- [ ] Liquify with forward, reconstruct, twirl, pucker, bloat, push, freeze, thaw, face controls, and reusable meshes.

## 7. RAW and high bit depth

- [x] Bayer/X-Trans RAW decode, editable RAW recipes, live development, and 16-bit master export.
- [x] Floating-point combined adjustment processing before display quantization.
- [ ] True 16-bit integer, half-float, and 32-bit float working documents.
- [ ] Float render textures and no forced 8-bit intermediate canvas.
- [ ] Camera/DNG profiles, dual illuminants, and calibrated white balance.
- [ ] Multiple high-quality Bayer and X-Trans demosaic modes.
- [ ] Highlight reconstruction, hot pixels, banding, chroma/luma noise, and local AI denoise.
- [ ] Lens database, distortion, vignette, aberration, defringe, and RAW sharpening.
- [ ] Scene-referred HDR and supported HDR-display preview.
- [ ] Portable sidecars, batch development, and full camera fixture matrix.

## 8. File compatibility

- [x] Common web formats, PSD/PSB import, layered/flattened PSD export, native projects, TIFF, and RAW.
- [x] Explicit PSD compatibility report and unsupported-content warnings.
- [ ] Native text, shape, fill, adjustment, effect, Smart Object, and Smart Filter PSD round-trip.
- [ ] Exact clipping, knockout, Blend If, group, comp, channel, path, guide, metadata, and ICC fidelity.
- [ ] CMYK, Lab, indexed, bitmap, 16-bit, and 32-bit PSD/PSB documents.
- [ ] Layered TIFF, multipart EXR, HDR, SVG, PDF, EPS, JPEG XL, JPEG 2000, HEIC, AVIF, and animated WebP.
- [ ] External Photoshop round-trip laboratory and visual-difference thresholds.

## 9. Smart Objects and Smart Filters

- [x] Embedded/linked object metadata, transforms, editable filters, order, visibility, blend, opacity, and masks.
- [ ] True embedded source documents editable in their own tabs.
- [x] Persistent linked-file handles, refresh, missing-link repair, relinking, and packaging.
- [ ] Shared and independent instances with a dependency graph and cycle protection.
- [ ] Nondestructive skew, perspective, warp, vector, RAW, and nested object content.
- [ ] Cached preview/final filter graph with versioned parameters.

## 10. Filters and effects

- [x] Core blur, sharpen, noise, color, stylize, and editable Smart Filter operations.
- [ ] Reference-quality blur gallery, Lens Blur, Surface Blur, Smart Sharpen, High Pass, and noise reduction.
- [ ] Lens correction, displacement, polar, wave, ripple, spherize, pixelate, and halftone.
- [ ] Oil Paint, lighting, clouds, fibers, Filter Gallery, and custom convolution.
- [ ] Third-party WASM filter API with deterministic CPU fallback.
- [ ] GPU/CPU reference-pixel tests.

## 11. Performance and large documents

- [x] Bounded dimensions, tiled adjustment passes, worker-based PSD processing, autosave, and storage reporting.
- [ ] WebGPU renderer with WebGL2/CPU fallback.
- [ ] OffscreenCanvas workers and WASM SIMD/threaded operations.
- [ ] Tiled document backing, mipmaps, dirty regions, cached composites, and GPU texture pooling.
- [ ] Memory-pressure adaptation and preview/final quality scheduling.
- [ ] OPFS scratch storage with selectable locations and quotas.
- [ ] Incremental saving, pixel deduplication, compressed history, and transaction journal.
- [ ] Cancelable jobs, watchdogs, and crash recovery.
- [ ] 12–100+ MP and hundreds-of-layers performance suite.

## 12. Typography, vectors, and layout

- [x] Editable text, basic shapes, Pen paths, fill/stroke, transforms, alignment, and guides.
- [x] Full Character/Paragraph controls, OpenType, variable fonts, international shaping, and missing-font handling.
- [ ] Text on/in paths, Warp Text, dynamic fitting, and text-to-shape/path conversion.
- [ ] Complete Bézier/Curvature Pen, anchor conversion, direct selection, and Boolean path operations.
- [ ] Stroke caps, joins, dashes, variable width, SVG import/export, and vector-preserving output.
- [ ] Artboards, frames, key-object alignment, smart spacing, and multi-scale asset export.

## 13. AI editing

- [x] Optional browser-local background removal with no required account or API key.
- [ ] Local subject, people-part, sky, clothing, depth, face, denoise, restore, relight, artifact-removal, colorize, and super-resolution models.
- [ ] Optional provider-neutral Generative Fill, Expand, Remove, Background, Harmonize, Upscale, and prompt editing.
- [ ] Reference guidance, variations, masks, progress, cancellation, and offline fallback.
- [ ] Explicit local/cloud labels, upload consent, model storage controls, provenance, and Content Credentials.

## 14. Print and professional color

- [x] Embedded export profiles, resolution metadata, proof simulation, and gamut-warning preview.
- [ ] ICC v2/v4 engine with Assign/Convert Profile, intents, and black-point compensation.
- [ ] RGB, CMYK, Lab, grayscale, spot, duotone, tritone, and quadtone working modes.
- [ ] Exact proof profiles, paper/ink simulation, ink limits, and separations.
- [ ] Printer/paper profiles, sizing, placement, bleed, trim, marks, contact sheets, and metadata.

## 15. Automation and extensibility

- [x] Recorded/exportable/validated local workflows and searchable registered commands.
- [ ] Editable actions, sets, conditionals, batch, Image Processor, and saved droplets.
- [ ] Variables, datasets, layer/artboard export, contact sheets, panorama, HDR merge, and focus stack.
- [ ] Auto-align, Auto-Blend, image stacks, and statistical modes.
- [ ] Sandboxed JavaScript/WASM plugin manifest, permissions, panels, filters, exporters, and versioning.
- [ ] Trusted local script console, headless worker, deterministic replay, and optional local CLI.

## 16. History, saving, and recovery

- [x] Undo/redo, history panel, named snapshots, branching, local autosave, recovery, versions, encryption, and saved locations.
- [x] Configurable history depth and memory-aware compaction.
- [x] Persistent history thumbnails and per-layer restoration.
- [ ] Atomic incremental saves, corruption repair, and crash transaction journal.
- [ ] External-drive disconnect handling, packaging, storage health, and retention controls.

## 17. Accessibility and cross-platform quality

- [x] Keyboard-oriented desktop workflow and accessible names on core controls.
- [ ] Complete keyboard and screen-reader operation with consistent focus.
- [x] High contrast, reduced motion, text scaling, and color-independent states.
- [x] Touch, pen buttons, eraser, and tablet layouts.
- [ ] Windows, macOS, Linux, ChromeOS, Chrome, Edge, Safari, and Firefox matrix.
- [ ] International keyboards, localization, RTL, 200% text, and WCAG 2.2 AA audit.

## 18. Documentation and release

- [x] Open-source repository, MIT license, local-first privacy statement, compatibility notes, and automated core checks.
- [x] Complete manual, shortcut map, format matrix, performance expectations, and privacy model.
- [x] Migration and backward-compatibility policy.
- [ ] Stable fixture pack and reproducible visual-regression suite.
- [x] Security review, dependency audit, contributor guide, issue templates, and release notes.
- [ ] Independent professional-editor beta and release-candidate signoff.
