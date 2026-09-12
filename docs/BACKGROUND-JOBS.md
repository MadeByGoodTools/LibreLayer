# Background-job safety

LibreLayer runs third-party `.librefilter` and `.libreplugin` JavaScript, WebAssembly, or CPU filter processing in a dedicated browser worker. The worker receives a copied RGBA pixel buffer and cannot mutate the open document directly. JavaScript contributions use a bounded expression interpreter with no property access, assignment, loops, imports, global objects, DOM, file, storage, or network APIs.

Auto-align, Auto-Blend, focus stack, HDR merge, panorama stitching, and statistical image stacks use the same isolation model in a dedicated stack worker. Auto-align returns translations only; stack and panorama operations return a complete copied result and never write into their source layers. Layer/artboard ZIP export and contact-sheet rendering yield between sources, report progress, and do not download or open a result until every source succeeds.

HDR merge is the exception to the display-buffer result format: its worker returns a transferable scene-linear `Float32Array` without tone mapping or 8-bit conversion. The editor validates its dimensions and opens it transactionally as a new 32-bit float document. SDR tone mapping and HDR highlight presentation happen only in the display path.

## Transaction sequence

1. LibreLayer validates the installed filter and active layer.
2. It copies the layer pixels and records an in-flight browser-local journal marker. For buffers of 4 MB or more, it also stages a temporary scratch copy in the configured browser-private or remembered-folder location.
3. The worker reports bounded progress from 0 through 100 percent.
4. **Cancel** immediately terminates the worker. A 30-second watchdog terminates a worker that does not finish.
5. LibreLayer writes returned pixels to the active layer only after successful completion, then creates one Undo state.
6. Cancellation, timeout, worker failure, or invalid output leaves the original canvas untouched and clears the journal marker and temporary scratch file.

If the browser or computer exits while a marker is present, the next LibreLayer session explains that the operation did not complete. Normal device-local document recovery then restores the last intact saved state. A job never stores partially processed pixels in the document.

The Cancel control and progress indicator appear in the compact status bar only while a job is active.

Trusted local script compilation uses a separate disposable headless worker. It receives only reviewed source, a deterministic seed, and bounded default options; it never receives document pixels or storage handles. It returns validated registered command records, is cancelable, and is terminated after two seconds. No commands run until the user explicitly replays the verified trace through normal editor handlers.
