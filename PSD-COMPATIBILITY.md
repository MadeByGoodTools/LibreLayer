# PSD compatibility — September 9, 2026

## Supported scope

- PSD and PSB import for bitmap, grayscale, indexed color, and 8-, 16- or 32-bit RGB. Supported 16/32-bit raster layers retain their original integer/float samples in LibreLayer's high-depth working surfaces while an 8-bit display proxy keeps browser rendering responsive. Exact embedded ICC profile bytes survive PSD import, project/recovery storage, and layered PSD export. General Photoshop ICC conversion and native high-depth PSD writing are not implemented yet.
- Raster layer names, order, visibility, whole-percent opacity and fill opacity, supported Canvas blend modes, masks, native clipping stacks, pass-through or isolated groups, translucent/masked groups, and simultaneous editable gray, red, green, and blue Blend If ranges per layer.
- Document resolution, ruler guides, grid spacing, and visibility/position Layer Comps remain editable. Layer Comps that capture appearance changes are reported instead of being imported or exported with missing state.
- Supported document metadata remains attached through PSD import/export, native project saves, browser recovery, and document switching: XMP packets, pixel aspect ratio, global effect angle/altitude, print scale, the untagged-profile flag, and the original validated ICC resource payload. Malformed or excessive values trigger the saved-composite path instead of being silently normalized.
- Native editable point and paragraph text with one character and paragraph style, including font, size, color, faux bold/italic, scale, tracking, kerning, leading, baseline shift, alignment, simple warp, underline, strike, small caps, ligatures and direction. The rendered bitmap is included for visual fallback. Vertical, path-based and mixed-style type is reported as unsupported and opens only through the explicit saved-composite choice.
- Native editable solid-color and two-color linear-gradient fill layers retain color, angle, scale, offset and rendered fallback. Noise-gradient and pattern fill layers are explicitly blocked from layered export and reported on import until their native PSD recipes are supported.
- Native editable shape layers retain closed straight or Bézier paths, supported Boolean path records, even-odd/non-zero fill rules, solid fill, fill visibility, and simple solid strokes with width, opacity, caps, joins, and dash values. Pattern/gradient strokes, open paths, inverted vector masks, or richer vector records are reported instead of simplified.
- Native editable Brightness/Contrast, Exposure, Vibrance, Hue/Saturation, Color Balance, Black & White, Photo Filter, Levels, Curves, Channel Mixer, Gradient Map, and Selective Color adjustment layers retain their supported values and masks. Combined LibreLayer recipes and other Photoshop adjustment families are explicitly blocked or reported until each can be represented without losing settings.
- Native editable Drop Shadow, Inner Shadow, Outer Glow, Inner Glow, Bevel, Satin, Color Overlay, two-color linear Gradient Overlay, and solid-color Stroke effects retain their shared colors, opacity, size, distance, angle, global-light choice, scale and supported contour. Multiple Photoshop instances, incompatible per-effect settings, advanced effect parameters and Pattern Overlay are explicitly blocked or reported instead of being simplified silently.
- Native embedded raster Smart Objects retain their PNG, JPEG or WebP source payload and shared-instance identifier. Gaussian Blur, Smart Sharpen and Brightness/Contrast Smart Filters retain their amount, opacity, blend mode, enabled state and order. Linked, masked, nested-document, Camera Raw, warped or unsupported-filter Smart Objects are explicitly blocked or reported until all of their source semantics can be retained.
- Mask offsets, default outside color and disabled state.
- Layered PSD export preserves supported raster structure, masks, clipping, fill opacity, multi-channel Blend If, and pass-through/isolated group compositing; transforms and pixel adjustments are baked into pixels. Native .librelayer saving remains the editable master.
- Flattened PSD export writes the current composite as one pixel layer.
- Unsupported layer features trigger a choice to open the PSD's saved composite instead of silently approximating editable layers. Original files are never overwritten.
- Live adjustment layers and blurred masks block layered export with guidance to use flattened PSD or native saving.

## Limits

256 MiB input; 16,384 pixels per side; 64 megapixels per document; 100 layers; 20 nested groups; 96 million expanded layer/mask pixels. Processing is serialized in a dedicated worker, with a two-minute timeout. CMYK, Lab, IPTC/EXIF resource blocks, print-profile conversion, and full Photoshop metadata fidelity are not supported.

## Verified locally in the browser

- Default two-layer artwork → File / Export layered PSD → reopen: exact rendered pixel match. PSD signature 8BPS and version 1 checked.
- 4×4 fixture: offset red raster layer at 50% opacity using Multiply, offset mask, and nested blue layer in a pass-through group. Layer panel confirmed names, order, group, blend, opacity and mask. Pixel samples: overlap [0,0,127,255]; red-only [255,0,0,128]; outside mask [0,0,0,0].
- Export that fixture through the real menu → decode and reopen: mask retained, opacity encoded as 128/255, Multiply retained, child Blue retained, no compatibility warning, exact rendered pixel match.
- Isolated-group fixture: compatibility dialog shown; explicit flattened-preview action opened the saved green composite, confirmed [0,255,0,255].
- Oversized 90,000×90,000 header: rejected with size-limit dialog; current document retained.
- File / Export flattened PSD: exactly one raster layer, pixel bytes match current composite.
- Native paragraph-text fixture: LibreLayer text metadata serialized through the PSD codec and reopened with content, font and box type intact; production-browser QA created the same editable text layer with its real character controls and no runtime errors.
- Native compositing fixture: clipping, fill opacity, simultaneous gray/RGB Blend If ranges, isolated-group opacity, group fill and raster group masks survive codec round trip.
- Native document-structure fixture: horizontal/vertical guides, grid spacing, resolution, and visibility/position Layer Comp records survive codec round trip; malformed and appearance-changing comps fail closed.
- Native document-metadata fixture: XMP, pixel aspect ratio, global effect lighting, print scale, and untagged-profile state survive codec round trip; unsafe metadata fails closed.
- Native shape fixture: vector mask knots, solid fill, fill state, stroke color, width, opacity, cap, join, and dash values survive codec round trip; unsupported vector records fail closed.
- TypeScript no-emit check and production build passed.

These are editor/library round-trip tests, not independent validation in Adobe Photoshop. Full PSD import/export remain partial in the 300-feature checklist.

## Repeatable round-trip laboratory

`pnpm test:psd-lab` now gates every release with a deterministic layered RGB fixture. It compares the complete layer-tree signature (names, order, groups, bounds, blends, opacity, clipping and masks) and applies explicit lossless visual thresholds: maximum channel delta 0, mean absolute channel delta 0 and changed-pixel ratio 0.

An operator can run the same gate against an externally created file with `pnpm test:psd-lab -- --file /absolute/path/to/fixture.psd`. The JSON report labels that run as externally supplied, but the fixture's authoring application and version must be recorded separately. This makes real Photoshop-produced fixtures measurable without claiming that the bundled deterministic fixture came from Photoshop.
