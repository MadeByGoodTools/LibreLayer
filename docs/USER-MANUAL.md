# LibreLayer user manual

LibreLayer is a local-first layered image editor for current desktop browsers. Editing, autosave, AI-assisted selections, and recovery happen on the device. Keep an exported `.librelayer` project for important work.

## Start and restore

- **New document:** File → New or `Ctrl/⌘+N`. Pick a photo, print, screen, social, or custom preset.
- **Open:** File → Open or `Ctrl/⌘+O`. Supported image, project, PSD/PSB, PDF/TIFF, and camera RAW files are routed to the appropriate importer.
- **Restore:** unfinished tabs restore automatically when enabled under Workspace & presets. File → Recover documents lists recovery copies; File → Version history lists dated versions.
- **Install:** the browser menu or File → Install LibreLayer can add an app-like shortcut. The product remains a web app.

## Workspace

The application menu and options bar run across the top, tools are on the left, the canvas is central, and Layers/Channels/Paths/History share the right dock. Panels can be docked or floated and the layout is stored on the browser profile. `Tab` hides or shows panels. `Ctrl/⌘+K` searches every registered command.

Use Fit, 100%, the status-bar zoom slider, canvas rotation, rulers, guides, and grid without changing document pixels. A captured reference can be shown as a split or side-by-side view with matched navigation.

## Layers and masks

Create pixel, text, shape, adjustment, fill, Smart Object, or group layers. The Layers panel controls order, visibility, opacity, fill, blend mode, clipping, grouping, links, color labels, and locks. Multi-select uses Shift for a range and Ctrl/⌘ to toggle.

Layer masks support density, feather, overlay, inversion, enable/disable, application, deletion, edge refinement, and independent transform when unlinked. Select and Mask offers six preview modes and can output a selection, layer mask, or duplicated layer with mask. Vector masks are editable paths.

Smart Objects retain embedded or linked source data, transforms, and editable Smart Filters. Linked files may require browser permission again after reconnecting a drive.

## Selecting

Use Marquee (`M`), Lasso (`L`), Magic Wand/Quick Selection (`W`), semantic Subject/People/Sky/Hair/Skin/Clothing/Object selections, Color Range, Focus Range, Similar, or luminosity ranges. New/Add/Subtract/Intersect changes how the next selection combines. Selection refinement includes Grow, Expand, Contract, Smooth, Feather, Border, Transform Selection, Quick Mask, saved selections, and Select and Mask.

## Painting and retouching

Brush (`B`), Pencil, Eraser (`E`), Clone (`S`), Healing (`J`), Fill (`G`), and Gradient (`D`) respect the active selection and unlocked layer. Brush dynamics include size, hardness, opacity, flow, spacing, smoothing, angle, roundness, pressure/tilt, jitter, scatter, texture, dual tip, wet edges, airbrush buildup, Mixer Brush, and vertical/horizontal/radial symmetry. Pattern Stamp, History Brush, and Art History Brush use real canvas sources.

Clone Source provides five reusable source slots with offset, scale, rotation, flips, alignment, and overlay. Sample All Layers can paint healing onto a blank retouch layer. Frequency Separation creates editable Low Frequency, High Frequency, and Retouching layers while retaining the hidden original.

Content-Aware Fill shows a live local preview: green is the sampling coverage and red is the replacement target. Choose Auto, Rectangular, Custom, or All Visible Layers; then tune color, rotation, scale, and mirror adaptation before Apply. A whole-canvas selection has no surrounding source in Auto mode—use a smaller selection or All Visible Layers.

## Color and adjustments

Use nondestructive adjustment layers whenever an edit may need revisiting. Available controls include exposure, brightness/contrast, RGB and per-channel Levels, point/freehand Curves, hue/saturation ranges, vibrance, color balance, black-and-white channel mixing, Channel Mixer, Selective Color, Gradient Map, Photo Filter, Shadows/Highlights, Replace Color, Match Color, HDR toning, and lift/gamma/gain wheels.

Built-in and imported `.cube` LUTs preview live. Histograms, waveform, RGB parade, and vectorscope help evaluate tone and color. CMYK and grayscale proof modes are previews only; they do not convert the document profile.

## Saving and export

- **Editable master:** File → Save layered project (`Ctrl/⌘+S`) writes `.librelayer`. Password-protected projects use local AES-256-GCM encryption; losing the password makes the file unrecoverable.
- **Default location:** Workspace & presets → Workspace → Choose folder remembers a supported local or external-drive folder. Downloads remains the cross-browser fallback.
- **Images:** Export supports PNG, JPEG, WebP, TIFF, and PDF. TIFF can include supported ICC profiles and print resolution. A true 16-bit TIFF master is available from retained high-precision RAW data.
- **PSD/PSB:** layered export is limited to compatible raster structure. The export dialog blocks or warns rather than silently baking unsupported editable features. Flattened export preserves appearance but not editability.

## History and performance

Undo/redo use `Ctrl/⌘+Z` and `Ctrl/⌘+Shift+Z`. The History panel can restore a state, name a snapshot, branch a state into a new tab, or create a change map. Performance settings configure 5–100 undo states and a 128–2,048 MB combined history budget. Oldest states are compacted when either limit is exceeded.

Current limits are 16,384 pixels per side, 64 megapixels per document, 96 million expanded layer/mask pixels across open tabs, 100 layers, 20 nested groups, and 256 MiB per input file. Close unused documents, reduce history, or lower dimensions when browser memory is constrained.

## Recovery and privacy

Changed documents are saved locally about every 10 seconds and when the page becomes hidden. Browser storage can be cleared by the user, private-browsing policy, or the operating system; use Protect local working storage when available and keep project-file backups. No document is uploaded by the editor’s local tools. A future cloud provider must be clearly labelled and require consent before upload.

## Core shortcuts

| Action | Shortcut |
| --- | --- |
| New / Open / Save | `Ctrl/⌘+N` / `Ctrl/⌘+O` / `Ctrl/⌘+S` |
| Undo / Redo | `Ctrl/⌘+Z` / `Ctrl/⌘+Shift+Z` |
| Cut / Copy / Paste layer | `Ctrl/⌘+X` / `Ctrl/⌘+C` / `Ctrl/⌘+V` |
| Free Transform / Duplicate | `Ctrl/⌘+T` / `Ctrl/⌘+J` |
| Select all / Deselect / Reselect | `Ctrl/⌘+A` / `Ctrl/⌘+D` / `Ctrl/⌘+Shift+D` |
| Clipping mask | `Alt/Option+Ctrl/⌘+G` |
| Merge down / Merge visible | `Ctrl/⌘+E` / `Ctrl/⌘+Shift+E` |
| Search commands / Hide panels | `Ctrl/⌘+K` / `Tab` |
| Zoom in / out / fit / 100% | `Ctrl/⌘+=` / `Ctrl/⌘+-` / `Ctrl/⌘+0` / `Ctrl/⌘+1` |
| Rulers | `Ctrl/⌘+R` |

Tool keys: `H` Hand, `R` Rotate View, `V` Move, `M` Marquee, `L` Lasso, `W` Smart Selection, `C` Crop, `I` Eyedropper, `B` Brush, `S` Clone, `J` Retouch, `E` Eraser, `G` Fill, `D` Gradient, `T` Text, `U` Shape, `P` Pen, and `Z` Zoom. Tool and command shortcuts can be reassigned under Workspace & presets; browser-reserved shortcuts may remain unavailable.

## Troubleshooting

- If a drive-backed recent file is unavailable, reconnect the drive and grant permission or open the file again.
- If a PSD warning appears, read the compatibility report and choose editable supported layers or the saved composite; the source file is not overwritten.
- If recovery storage is full, export important projects, remove unneeded recoveries/versions, and lower the history budget.
- If a long operation fails, the current document remains open; retry with fewer layers or a smaller document and report the exact status message.
