# PSD compatibility — September 9, 2026

## Supported scope

- Standard PSD, 8-bit RGB. Pixels are interpreted in the browser RGB space; Photoshop ICC conversion is not implemented.
- Raster layer names, order, visibility, whole-percent opacity, supported Canvas blend modes, masks and pass-through groups.
- Mask offsets, default outside color and disabled state.
- Layered PSD export preserves supported raster structure and masks; transforms and pixel adjustments are baked into pixels. Native .pixelstudio saving remains the editable master.
- Flattened PSD export writes the current composite as one pixel layer.
- Unsupported layer features trigger a choice to open the PSD's saved composite instead of silently approximating editable layers. Original files are never overwritten.
- Live adjustment layers and blurred masks block layered export with guidance to use flattened PSD or native saving.

## Limits

128 MB input; 8192 pixels per side; 24 megapixels per document; 100 layers; 20 nested groups; 32 million expanded layer/mask pixels. Processing is serialized in a dedicated worker, with a 45-second timeout. PSB, 16-bit/32-bit, CMYK and full Photoshop metadata fidelity are not supported.

## Verified locally in the browser

- Default two-layer artwork → File / Export layered PSD → reopen: exact rendered pixel match. PSD signature 8BPS and version 1 checked.
- 4×4 fixture: offset red raster layer at 50% opacity using Multiply, offset mask, and nested blue layer in a pass-through group. Layer panel confirmed names, order, group, blend, opacity and mask. Pixel samples: overlap [0,0,127,255]; red-only [255,0,0,128]; outside mask [0,0,0,0].
- Export that fixture through the real menu → decode and reopen: mask retained, opacity encoded as 128/255, Multiply retained, child Blue retained, no compatibility warning, exact rendered pixel match.
- Isolated-group fixture: compatibility dialog shown; explicit flattened-preview action opened the saved green composite, confirmed [0,255,0,255].
- Oversized 90,000×90,000 header: rejected with size-limit dialog; current document retained.
- File / Export flattened PSD: exactly one raster layer, pixel bytes match current composite.
- TypeScript no-emit check and production build passed.

These are editor/library round-trip tests, not independent validation in Adobe Photoshop. Full PSD import/export remain partial in the 300-feature checklist.
