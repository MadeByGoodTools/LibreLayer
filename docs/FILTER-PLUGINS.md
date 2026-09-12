# LibreLayer filter plug-ins

LibreLayer filter plug-ins are small JSON files with the `.librefilter` extension. They are installed from **Filter → Load Filter Plug-in…**, stored only in the current browser profile, and run from **Filter → Run Last Filter Plug-in**. Removing a plug-in does not change any previously edited pixels.

## Manifest

```json
{
  "format": "librelayer-filter-plugin",
  "version": 1,
  "id": "example.sharpen",
  "name": "Example Sharpen",
  "pluginVersion": "1.0.0",
  "cpuKernel": [0, -1, 0, -1, 5, -1, 0, -1, 0],
  "wasmBase64": "optional-base64-module"
}
```

The `cpuKernel` is a required row-major 3×3 convolution kernel. It is the deterministic fallback on browsers without WebAssembly and whenever the supplied module cannot compile or run. Coefficients must be finite and their combined absolute value may not exceed 64. Plug-in ids may contain letters, numbers, dots, underscores, and hyphens. Names and versions are limited to 80 characters. WebAssembly modules are limited to 1 MiB and complete plug-in files to 1.5 MB.

## WebAssembly ABI

The module receives no imports and must export:

- `memory`: WebAssembly linear memory.
- `process(ptr, byteLength, width, height, amount)`: a function that edits RGBA8 pixels in place.

LibreLayer writes tightly packed RGBA8 pixels at `ptr = 0`, grows exported memory if necessary, and passes amount as an integer from 0 through 100. The function must leave exactly `byteLength` output bytes at the same address. It cannot access the network, DOM, local files, or LibreLayer document state through the ABI.

## Editing behavior

- The active unlocked pixel layer is the only input and output.
- An active selection limits the result to that selection.
- The edit creates one history state and supports Undo and Redo.
- A rejected manifest never changes the document.
- A WebAssembly failure uses the declared CPU kernel and reports the fallback in the status bar.
- Processing runs in a dedicated worker with status-bar progress, cancellation, and a 30-second watchdog. Pixels are committed only after the worker finishes successfully.

See `tests/fixtures/sharpen.librefilter` for a working CPU-only example.
