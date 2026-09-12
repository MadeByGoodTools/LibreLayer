# Large-document performance QA

Run the repeatable command-line suite with:

```sh
pnpm test:performance
```

The suite performs real typed-array work over tiled 12, 36, 64, and 100 megapixel fixtures, then composites a 300-layer pixel tile. It validates exact tile coverage, deterministic checksums, and a generous 15-second safety budget. The 100 MP fixture tests the tiled processing path; LibreLayer’s current single-document creation limit remains 64 MP.

Users and release testers can run the same worker-backed workloads from **Workspace & presets → Performance → Run local check**. The browser report includes elapsed time, tile count, and layer count. It executes in a dedicated worker so the editor interface remains responsive and terminates automatically on completion, failure, or a 30-second watchdog.

For automated browser QA, opening `?qa=performance` starts the check and opens its result panel. This route changes no document pixels or saved preferences.
