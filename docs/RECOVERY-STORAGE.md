# Incremental recovery storage

LibreLayer saves only documents whose editing fingerprint changed. Each recovery write follows this browser-local transaction:

1. Record a journal entry naming the document or dated version.
2. Extract image data URLs from the project manifest.
3. Hash the decoded PNG bytes with SHA-256 and replace them with content-addressed references.
4. Store each new pixel or mask asset once, even when multiple layers or versions contain identical content.
5. Gzip the compact JSON manifest when the browser supports compression streams.
6. Atomically commit assets and the record while removing the journal entry.

IndexedDB guarantees that the final commit either completes in full or does not become visible. A journal entry left by a closed tab therefore identifies an interrupted pre-commit operation, not a partially written project. LibreLayer clears those entries on startup and compacts assets that are no longer referenced. Deleting a recovery or version also runs compaction.

File → Recover documents audits each recovery independently. A damaged manifest or missing pixel asset is reported without hiding healthy documents or changing the damaged record. When an intact dated version exists, **Repair from version** atomically replaces only that recovery copy with the newest readable version. If no version is readable, LibreLayer offers removal but never silently substitutes or flattens content.

Existing records from earlier LibreLayer builds keep their inline image data and remain readable. New records are hydrated back to the same native `.librelayer` project structure before restore, so reopening does not flatten layers, masks, paths, selections, or editable recipes.
