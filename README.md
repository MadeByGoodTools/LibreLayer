# LibreLayer

LibreLayer is a free, open-source layered image editor that runs in the browser. It provides familiar desktop-style editing workflows without requiring users to upload their work to a server.

[Open LibreLayer](https://librelayer.goodtools.ca) · [Good Tools product page](https://goodtools.ca/tools/librelayer)

![LibreLayer editor](docs/screenshots/librelayer.jpg)

## Highlights

- Pixel, text, shape, adjustment, smart-object, and grouped layers
- Editable Smart Filter stacks with live amount, opacity, blend, order, visibility, and filter masks
- Layer masks, vector masks, channels, paths, clipping, linking, and lock controls
- Brushes, selections, crop, transforms, clone, heal, fill, gradients, and filters
- Per-channel curves, levels, color balance, HSL, color grading, and blend modes
- PSD and PSB import, common image formats, editable LibreLayer projects, and web export
- Layered 8/16/32-bit RGB PSD/PSB import with explicit display-working conversion for high-depth sources
- Color-managed TIFF export with embedded sRGB, Display P3, Adobe RGB, or ProPhoto RGB profiles and print-resolution metadata
- Bayer and X-Trans camera RAW development from sensor data with live wide-gamut controls, re-editable RAW Smart Objects, device-local source recovery, and genuine 16-bit TIFF master export
- Tiled floating-point adjustment passes combine exposure, levels, curves, color balance, hue, saturation, vibrance, and channel-mixed black-and-white before one final canvas write
- Responsive active-layer previews update continuously across every combined adjustment and blur control without repeatedly processing the full-resolution document
- Non-destructive adjustment layers retain editable floating-point exposure, levels, curves, hue, saturation, vibrance, color balance, channel-mixed black-and-white, masks, opacity, and blur
- Live RGB and luminance histograms expose shadow and highlight clipping while adjustment-layer controls change
- Direct input-level handles beneath the histogram provide constrained black point, midtone gamma, and white point editing
- Interactive RGB, red, green, and blue tone curves provide draggable shadow and highlight points with keyboard control and live high-precision previews
- Live Portrait, Landscape, Matte, Warm, B&W, and Neutral adjustment presets preview before an explicit Apply and remain fully editable
- Browser-local background removal and assisted tools
- Familiar keyboard shortcuts, history, rulers, guides, tabs, and configurable workspaces
- Searchable command palette for every tool and registered menu action with `Cmd/Ctrl+K`
- Branch any history state into an independent editable document and generate pixel-accurate change maps
- Record, export, validate, and replay open `.libreflow` editing workflows without executing arbitrary code
- Password-encrypted layered project packages using local AES-256-GCM encryption
- Device-local autosave, recovery, recent projects, preferences, and optional installation
- Live CMYK/grayscale soft proofing, magenta gamut warnings, document performance/storage reporting, and downloadable PSD compatibility reports

Projects remain on the user's device unless they explicitly export or share a file.

## Run locally

Requirements: Node.js 22.13 or newer and pnpm.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173`.

## Validate

```bash
pnpm build
pnpm test:core
pnpm lint
```

## File compatibility

See [PSD-COMPATIBILITY.md](PSD-COMPATIBILITY.md) for the current PSD and PSB compatibility notes. Third-party decoder and renderer notices are included in [public/editor-import-licenses.txt](public/editor-import-licenses.txt).

## Contributing

Issues and pull requests are welcome. Please preserve non-destructive editing behavior, familiar shortcuts, keyboard access, and device-local privacy. Add or update tests when changing an editing workflow.

## License

LibreLayer is released under the [MIT License](LICENSE). Third-party packages and bundled notices retain their own licenses.
