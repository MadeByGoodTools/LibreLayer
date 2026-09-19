# Large-document performance QA

Run the repeatable command-line suite with:

```sh
pnpm test:performance
```

The suite performs real typed-array work over tiled 12, 36, 64, and 100 megapixel fixtures, then composites a 300-layer pixel tile. It validates exact tile coverage, deterministic checksums, and a generous 15-second safety budget. The 100 MP fixture tests the tiled processing path; LibreLayer’s current single-document creation limit remains 64 MP.

Users and release testers can run the same worker-backed workloads from **Workspace & presets → Performance → Run local check**. The browser report includes elapsed time, tile count, and layer count. It executes in a dedicated worker so the editor interface remains responsive and terminates automatically on completion, failure, or a 30-second watchdog.

For automated browser QA, opening `?qa=performance` starts the check and opens its result panel. This route changes no document pixels or saved preferences.

## Accelerated pixel fallbacks

Invert and grayscale try the WebGPU compute renderer first. When WebGPU is unavailable, Invert uses LibreLayer's built-in WebAssembly SIMD kernel in a dedicated worker before trying WebGL2 and the deterministic CPU reference path. The worker receives a copied RGBA8 buffer, reports progress, can be cancelled by terminating the worker, stops at a bounded watchdog, and commits only a complete result. The SIMD kernel handles four pixels per vector instruction and preserves every alpha byte. Its human-readable source is committed at `lib/wasm/invert-simd.wat`; no module is downloaded at runtime.

Browsers without WebAssembly SIMD skip that route automatically. Grayscale falls back directly from WebGPU to WebGL2 and then CPU because its current reference luminance equation is not implemented by the SIMD module. None of these accelerated paths uploads image data.
