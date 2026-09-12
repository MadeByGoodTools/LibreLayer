# LibreLayer user manual

LibreLayer is a local-first layered image editor for current desktop browsers. Editing, autosave, AI-assisted selections, and recovery happen on the device. Keep an exported `.librelayer` project for important work.

## Start and restore

- **New document:** File → New or `Ctrl/⌘+N`. Pick a photo, print, screen, social, or custom preset.
- **Open:** File → Open or `Ctrl/⌘+O`. Supported image, project, PSD/PSB, PDF/TIFF, and camera RAW files are routed to the appropriate importer.
- **Restore:** unfinished tabs restore automatically when enabled under Workspace & presets. File → Recover documents lists recovery copies; File → Version history lists dated versions.
- **Install:** the browser menu or File → Install LibreLayer can add an app-like shortcut. The product remains a web app.

## Workspace

The application menu and options bar run across the top, tools are on the left, the canvas is central, and Layers/Channels/Paths/History share the right dock. Panels can be docked or floated and the layout is stored on the browser profile. `Tab` hides or shows panels. `Ctrl/⌘+K` searches every registered command.

Appearance settings provide dark, light, and high-contrast themes; 85–125% interface scaling; and system-controlled, always-reduced, or full interface motion. Selected tools expose both an accessible pressed state and a visible edge/outline so the state does not depend on color alone.

Use Fit, 100%, the status-bar zoom slider, canvas rotation, rulers, guides, and grid without changing document pixels. A captured reference can be shown as a split or side-by-side view with matched navigation.

## Layers and masks

Create pixel, text, shape, adjustment, fill, Smart Object, or group layers. The Layers panel controls order, visibility, opacity, fill, blend mode, clipping, grouping, links, color labels, and locks. Multi-select uses Shift for a range and Ctrl/⌘ to toggle.

Layer masks support density, feather, overlay, inversion, enable/disable, application, deletion, edge refinement, and independent transform when unlinked. Select and Mask offers six preview modes and can output a selection, layer mask, or duplicated layer with mask. Vector masks are editable paths.

Smart Objects retain embedded or linked source data, transforms, and editable Smart Filters. When the browser supports file handles, linked sources remember their connection on this browser profile. Use **Refresh** to reread the source and **Relink** after a file moves or a drive is reconnected. A missing or denied link is shown explicitly, while the packaged embedded fallback remains visible and travels inside the `.librelayer` project. Browsers without persistent handles can still place a linked-style object with an embedded fallback, but must use Relink to refresh it.

**New shared Smart Object instance** duplicates the selected Smart Object while keeping its source identity shared; replacing or relinking the source updates every shared instance while their transforms and Smart Filter stacks remain independent. **Make Smart Object independent** embeds the current appearance under a new source identity. LibreLayer records nested source dependencies in the project and refuses cyclic dependency graphs instead of recursively opening or corrupting them.

For an embedded Smart Object, choose **Edit contents** in Layers or **Layer > Edit Smart Object contents**. Its layered source opens in a linked document tab. Each source edit synchronizes back to every shared instance, adds an undoable history state to the parent, and stores the complete source layer tree inside the `.librelayer` project. Opening the same source again switches to its existing tab. Linked-file Smart Objects remain controlled by Refresh, Relink, and Replace so LibreLayer never silently overwrites an external file.

Smart Filter sliders use a separately cached live-preview pass while you adjust them, followed by a full-quality render after the control settles. Source and filter parameter versions are stored in the project and form part of the cache key, so replacing source pixels, reopening older projects, or changing filter order and settings cannot reuse a stale result. The bounded local cache automatically releases its least-recently-used renders.

## Selecting

Use Marquee (`M`), Lasso (`L`), Magic Wand/Quick Selection (`W`), semantic Subject/People/Sky/Hair/Skin/Clothing/Object selections, Color Range, Focus Range, Similar, or luminosity ranges. New/Add/Subtract/Intersect changes how the next selection combines. Selection refinement includes Grow, Expand, Contract, Smooth, Feather, Border, Transform Selection, Quick Mask, saved selections, and Select and Mask.

## Painting and retouching

Brush (`B`), Pencil, Eraser (`E`), Clone (`S`), Healing (`J`), Fill (`G`), and Gradient (`D`) respect the active selection and unlocked layer. Brush dynamics include size, hardness, opacity, flow, spacing, smoothing, angle, roundness, pressure/tilt, jitter, scatter, texture, dual tip, wet edges, airbrush buildup, Mixer Brush, and vertical/horizontal/radial symmetry. Pattern Stamp, History Brush, and Art History Brush use real canvas sources.

Open Brush dynamics to manage the browser-local brush library. **Define from selection** turns the active selection—or the whole document when nothing is selected—into a grayscale tip. **Import tips** accepts ordinary images and ABR v6, v7, v9, and v10 brush packs. All brushes found in an ABR pack are imported together, with supported size, angle, roundness, spacing, scatter, and transfer settings. Rename brushes, move them between folders, add comma-separated tags, mark favorites, and search across names, folders, and tags. Custom tips and the active-tip choice persist on this browser profile.

On supported tablets, the pen tip uses the active painting tool with pressure and tilt. Flip to the eraser end to erase temporarily without changing tools, or hold the barrel button and tap to sample the canvas color. Secondary touch contacts are reserved for viewport gestures, and coarse-pointer devices automatically receive larger controls and roomier tool spacing.

Clone Source provides five reusable source slots with offset, scale, rotation, flips, alignment, and overlay. Sample All Layers can paint healing onto a blank retouch layer. Frequency Separation creates editable Low Frequency, High Frequency, and Retouching layers while retaining the hidden original.

Content-Aware Fill shows a live local preview: green is the sampling coverage and red is the replacement target. Choose Auto, Rectangular, Custom, or All Visible Layers; then tune color, rotation, scale, and mirror adaptation before Apply. A whole-canvas selection has no surrounding source in Auto mode—use a smaller selection or All Visible Layers.

## History

New history states include a compact visual thumbnail. Choose a state name to restore the whole document, **Layer** to restore only the currently selected layer from that state, **Branch** to open the state as an independent document tab, or **Compare** to open a pixel-accurate change map. A layer-only restore brings back that layer's pixels, mask, editable settings, and supported parent placement, leaves all other layers untouched, and adds a new undoable history state. History remains available while its document tab is open; named version snapshots provide browser-local recovery across sessions.

## Typography

Choose Text (`T`), enter point or paragraph copy, and click the canvas. Character & paragraph controls cover font, continuous variable weight, width, style, size, tracking, kerning, leading, baseline shift, alignment, first-line indent, paragraph spacing, underline, strikethrough, small caps, and ligatures. Automatic or explicit left-to-right/right-to-left direction and a language setting preserve native browser shaping for Arabic, Hebrew, Indic, CJK, accented text, emoji, and other complex runs.

Path placement follows a chosen saved path using its actual segment distances and tangents, or flows paragraph text inside a closed saved path with clipping. Warp Text provides Arc, Arch, Flag, Wave, Bulge, and Fish recipes with an editable bend value. Paragraph text can remain at its authored size, shrink until it fits, or expand to fill a bounded text box. **Convert to shapes** preserves the rendered appearance and traces visible glyph alpha into separate editable outline paths, including disconnected contours, instead of substituting a bounding rectangle.

## Paths

Use the Pen tool in Straight, Curvature, or Freeform mode and close the draft to save a work path. The selected path appears on the canvas with its real cubic curve, anchors, direction handles, and control lines. Drag an anchor or either Bézier handle directly; smooth handles remain mirrored. The Direct Selection menu also provides exact anchor selection, numeric X/Y positioning, one-pixel nudging, point insertion/deletion, and corner/smooth conversion. In the Paths panel, select exactly two paths and choose Unite, Subtract, Intersect, or Exclude to create new editable result contours. Path edits, conversions, and Boolean results are preserved in project files and undo history.

The Stroke menu stores a path colour, separate start and end widths, butt/round/square caps, miter/round/bevel joins, and solid, dashed, dotted, or dash-dot patterns. **Paint stroke** renders the saved recipe onto the selected unlocked pixel layer, including tapered width. **Import SVG** converts supported `M`, `L`, `H`, `V`, `C`, `Q`, and `Z` path data into editable LibreLayer anchors. **Export SVG** keeps cubic curves and stroke attributes as vector data; LibreLayer's start/end width metadata is included so a later import restores the tapered recipe.

Load local font accepts WOFF2, WOFF, TTF, and OTF files without uploading them. Locally loaded fonts last for the current editing session. When a project references a font that is not installed, LibreLayer displays a missing-font warning and uses a visible system fallback until the font is loaded.

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

| Action                           | Shortcut                                          |
| -------------------------------- | ------------------------------------------------- |
| New / Open / Save                | `Ctrl/⌘+N` / `Ctrl/⌘+O` / `Ctrl/⌘+S`              |
| Undo / Redo                      | `Ctrl/⌘+Z` / `Ctrl/⌘+Shift+Z`                     |
| Cut / Copy / Paste layer         | `Ctrl/⌘+X` / `Ctrl/⌘+C` / `Ctrl/⌘+V`              |
| Free Transform / Duplicate       | `Ctrl/⌘+T` / `Ctrl/⌘+J`                           |
| Select all / Deselect / Reselect | `Ctrl/⌘+A` / `Ctrl/⌘+D` / `Ctrl/⌘+Shift+D`        |
| Clipping mask                    | `Alt/Option+Ctrl/⌘+G`                             |
| Merge down / Merge visible       | `Ctrl/⌘+E` / `Ctrl/⌘+Shift+E`                     |
| Search commands / Hide panels    | `Ctrl/⌘+K` / `Tab`                                |
| Zoom in / out / fit / 100%       | `Ctrl/⌘+=` / `Ctrl/⌘+-` / `Ctrl/⌘+0` / `Ctrl/⌘+1` |
| Rulers                           | `Ctrl/⌘+R`                                        |

Tool keys: `H` Hand, `R` Rotate View, `V` Move, `M` Marquee, `L` Lasso, `W` Smart Selection, `C` Crop, `I` Eyedropper, `B` Brush, `S` Clone, `J` Retouch, `E` Eraser, `G` Fill, `D` Gradient, `T` Text, `U` Shape, `P` Pen, and `Z` Zoom. Tool and command shortcuts can be reassigned under Workspace & presets; browser-reserved shortcuts may remain unavailable.

## Troubleshooting

- If a drive-backed recent file is unavailable, reconnect the drive and grant permission or open the file again.
- If a PSD warning appears, read the compatibility report and choose editable supported layers or the saved composite; the source file is not overwritten.
- If recovery storage is full, export important projects, remove unneeded recoveries/versions, and lower the history budget.
- If a long operation fails, the current document remains open; retry with fewer layers or a smaller document and report the exact status message.
