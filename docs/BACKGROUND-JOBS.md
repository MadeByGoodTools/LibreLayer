# Background-job safety

LibreLayer runs third-party filter processing in a dedicated browser worker. The worker receives a copied RGBA pixel buffer and cannot mutate the open document directly.

## Transaction sequence

1. LibreLayer validates the installed filter and active layer.
2. It copies the layer pixels and records an in-flight browser-local journal marker. For buffers of 4 MB or more, it also stages a temporary scratch copy in the configured browser-private or remembered-folder location.
3. The worker reports bounded progress from 0 through 100 percent.
4. **Cancel** immediately terminates the worker. A 30-second watchdog terminates a worker that does not finish.
5. LibreLayer writes returned pixels to the active layer only after successful completion, then creates one Undo state.
6. Cancellation, timeout, worker failure, or invalid output leaves the original canvas untouched and clears the journal marker and temporary scratch file.

If the browser or computer exits while a marker is present, the next LibreLayer session explains that the operation did not complete. Normal device-local document recovery then restores the last intact saved state. A job never stores partially processed pixels in the document.

The Cancel control and progress indicator appear in the compact status bar only while a job is active.
