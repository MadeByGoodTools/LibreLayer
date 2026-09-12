# LibreLayer format matrix

“Open” means the browser can decode the file on a supported platform. “Editable” means LibreLayer preserves the listed structure—not that every feature of the originating application round-trips.

| Format | Open/import | Export | Editable fidelity and limits |
| --- | --- | --- | --- |
| `.librelayer` | Yes | Yes | Preferred layered master; versioned, checksummed package. Optional AES-256-GCM password protection. Legacy `.pixelstudio` packages remain readable. |
| PNG | Yes | Yes | Opens as one pixel layer; export retains alpha. |
| JPEG | Yes | Yes | Opens as one pixel layer; export is quality-adjustable and flattened onto the selected matte. |
| WebP | Browser-dependent decode | Yes | Opens as one pixel layer; export retains supported alpha. Animated WebP is not retained as a timeline. |
| TIFF | Yes through the paged importer | Yes | Opens rendered pages/frames. Export supports 8-bit output and genuine 16-bit RGB from retained high-precision RAW data, ICC profile, and resolution metadata. Layered TIFF is not preserved. |
| PDF | Yes through the paged importer | Yes | Imports a selected rendered page. Export is flattened; vectors and text are not retained as PDF objects. |
| PSD / PSB | Yes | Yes, bounded | Supported RGB raster layers, groups, masks, names, visibility, opacity, and supported blends. Unsupported content produces a report and saved-composite choice. See `PSD-COMPATIBILITY.md`. |
| Camera RAW: CR2, CR3, NEF, ARW, DNG, RAF, ORF, RW2 | Yes for supported Bayer/X-Trans sensor data | Developed image / 16-bit TIFF master | Opens into the local RAW developer with persisted demosaic, white-balance, camera/DNG profile, detail/noise, and focal-family optics recipes plus optional Smart Object source recovery. Camera coverage is not yet a complete vendor/model matrix. |
| LibreLayer Camera Raw recipe: `.libreRAW.json` | Yes | Yes | Portable validated development sidecar only; it contains no source image pixels, rejects unknown recipe versions or out-of-range settings, and can drive sequential local PNG batch development. |
| LibreLayer Action set: `.libreactions` | Yes | Yes | Portable validated sets of editable, ordered, conditional steps; unknown commands and unsafe settings fail closed. |
| LibreLayer droplet recipe: `.libredroplet` | Yes | Yes | Portable Action plus bounded Image Processor output settings. It contains no source images or executable code. |
| LibreLayer dataset: `.libredata`, CSV, JSON | Yes | Yes | Validated local text-variable records only; portable datasets are versioned and browser persistence contains no source image pixels. |
| Layer/artboard asset ZIP | Export | No | One uncompressed standards-compatible ZIP containing cropped layer PNGs and enabled multi-scale artboard PNGs. |
| `.cube` LUT | Import into adjustments | No LUT authoring | 3D LUT parser with bounded grid/domain validation and live amount. |
| `.psbrush.json` | Yes | Yes | LibreLayer brush recipe including dynamics and mixer settings. |
| `.abr` brush pack | Yes, v6/v7/v9/v10 | No ABR authoring | Imports every parsed brush into a persistent local folder. Sampled tips and supported size, angle, roundness, spacing, scatter, opacity, flow, and size dynamics are retained; unsupported proprietary effects are omitted. |
| `.libreflow` | Yes | Yes | Validated command workflow; unknown commands and unsafe values are rejected. No arbitrary code execution. |
| LibreLayer Liquify mesh `.json` | Yes | Yes | Reusable versioned displacement and freeze-mask grid. Import requires the same document dimensions and rejects malformed data. |
| SVG, EPS, JPEG XL, JPEG 2000, HEIC, AVIF, EXR | Not guaranteed | No dedicated exporter | These formats remain roadmap items. A browser may decode some as a flattened image, but LibreLayer does not claim portable support. |

Smart Objects in `.librelayer` projects retain embedded layered, vector, nested, and Camera RAW source content. Linked objects package an embedded fallback. Scale, rotation, skew, distortion, perspective, mesh, split, cylindrical, Puppet, perspective warp, and named warp recipes remain editable after reopening; rasterizing is an explicit command. Embedded documents are bounded to 100 layers and 20 nesting levels, and cyclic object relationships are rejected.

Global import limits: 256 MiB file size, 16,384 pixels per side, 64 megapixels per document, 96 million expanded layer/mask pixels across open documents, 100 layers, and 20 nested groups. Files are never silently resized to fit.
