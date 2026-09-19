# PSD compatibility — September 9, 2026

## Supported scope

- PSD and PSB in 8-, 16- or 32-bit RGB. Supported high-depth layers are preserved structurally and tone-mapped into the current 8-bit browser working canvas; Photoshop ICC conversion is not implemented.
- Raster layer names, order, visibility, whole-percent opacity, supported Canvas blend modes, masks and pass-through groups.
- Mask offsets, default outside color and disabled state.
- Layered PSD export preserves supported raster structure and masks; transforms and pixel adjustments are baked into pixels. Native .pixelstudio saving remains the editable master.
- Flattened PSD export writes the current composite as one pixel layer.
- Unsupported layer features trigger a choice to open the PSD's saved composite instead of silently approximating editable layers. Original files are never overwritten.
- Live adjustment layers and blurred masks block layered export with guidance to use flattened PSD or native saving.

## Limits

256 MiB input; 16,384 pixels per side; 64 megapixels per document; 100 layers; 20 nested groups; 96 million expanded layer/mask pixels. Processing is serialized in a dedicated worker, with a two-minute timeout. CMYK, Lab, indexed color and full Photoshop metadata fidelity are not supported.

## Verified locally in the browser

- Default two-layer artwork → File / Export layered PSD → reopen: exact rendered pixel match. PSD signature 8BPS and version 1 checked.
- 4×4 fixture: offset red raster layer at 50% opacity using Multiply, offset mask, and nested blue layer in a pass-through group. Layer panel confirmed names, order, group, blend, opacity and mask. Pixel samples: overlap [0,0,127,255]; red-only [255,0,0,128]; outside mask [0,0,0,0].
- Export that fixture through the real menu → decode and reopen: mask retained, opacity encoded as 128/255, Multiply retained, child Blue retained, no compatibility warning, exact rendered pixel match.
- Isolated-group fixture: compatibility dialog shown; explicit flattened-preview action opened the saved green composite, confirmed [0,255,0,255].
- Oversized 90,000×90,000 header: rejected with size-limit dialog; current document retained.
- File / Export flattened PSD: exactly one raster layer, pixel bytes match current composite.
- TypeScript no-emit check and production build passed.

These are editor/library round-trip tests, not independent validation in Adobe Photoshop. Full PSD import/export remain partial in the 300-feature checklist.

## Repeatable round-trip laboratory

`pnpm test:psd-lab` now gates every release with a deterministic layered RGB fixture. It compares the complete layer-tree signature (names, order, groups, bounds, blends, opacity, clipping and masks) and applies explicit lossless visual thresholds: maximum channel delta 0, mean absolute channel delta 0 and changed-pixel ratio 0.

An operator can run the same gate against an externally created file with `pnpm test:psd-lab -- --file /absolute/path/to/fixture.psd`. The JSON report labels that run as externally supplied, but the fixture's authoring application and version must be recorded separately. This makes real Photoshop-produced fixtures measurable without claiming that the bundled deterministic fixture came from Photoshop.
