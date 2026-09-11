# LibreLayer

LibreLayer is a free, open-source layered image editor that runs in the browser. It provides familiar desktop-style editing workflows without requiring users to upload their work to a server.

[Open LibreLayer](https://librelayer.goodtools.ca) · [Good Tools product page](https://goodtools.ca/tools/librelayer)

![LibreLayer editor](docs/screenshots/librelayer.jpg)

## Highlights

- Pixel, text, shape, adjustment, smart-object, and grouped layers
- Layer masks, vector masks, channels, paths, clipping, linking, and lock controls
- Brushes, selections, crop, transforms, clone, heal, fill, gradients, and filters
- Per-channel curves, levels, color balance, HSL, color grading, and blend modes
- PSD and PSB import, common image formats, editable LibreLayer projects, and web export
- Bayer and X-Trans camera RAW development from sensor data with live wide-gamut controls
- Browser-local background removal and assisted tools
- Familiar keyboard shortcuts, history, rulers, guides, tabs, and configurable workspaces
- Device-local autosave, recovery, recent projects, preferences, and optional installation

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
