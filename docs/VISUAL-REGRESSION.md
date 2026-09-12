# Visual regression gate

LibreLayer uses a deterministic, browser-independent pixel fixture to detect unintended rendering changes. The fixture generates the same RGBA source image on every run and exercises representative reference, color-grade, painterly, and seeded procedural operations.

Run the gate with:

```sh
pnpm test:visual
```

Every case must print `PASS` with the exact SHA-256 value stored in `tests/fixtures/visual-regression.json`. A rendering change that alters a hash is a release failure until it is investigated.

Golden hashes may be updated only when the pixel change is intentional and reviewed. Record the new output from a failing run, inspect the affected operation in the browser, update only the relevant expected hash, and rerun both `pnpm test:visual` and `pnpm test:core`.

The fixture is deliberately small and deterministic so it remains fast enough for every change. It complements, rather than replaces, interactive browser checks, cross-browser validation, large-document performance tests, and external file-format round trips.
