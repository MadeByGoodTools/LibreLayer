# Privacy and local storage

LibreLayer’s editor is local-first. Image pixels, layered projects, recovery records, preferences, imported LUTs, and local AI-assisted selection work stay in the browser unless the user explicitly downloads, shares, or later chooses a clearly labelled cloud feature.

The web host receives ordinary page requests. The editor does not send open document contents to Good Tools. Browser extensions, operating-system services, downloaded third-party fonts, and a user-selected future AI provider have their own privacy boundaries; LibreLayer must not describe those services as local.

Browser-profile storage includes preferences, open-workspace recovery, dated versions, recent-file handles, retained RAW source assets, and saved default-directory handles. The browser may revoke file-system permission or clear local data. “Protect local working storage” requests persistent storage but cannot replace backups.

Recovery writes are incremental by changed document. Pixel and mask PNGs are stored once by their SHA-256 content identity and shared by matching recovery/version records; compact manifests are gzip-compressed when supported. Each write uses an IndexedDB transaction journal and commits the manifest, new assets, and journal removal atomically. On startup, LibreLayer clears interrupted journal entries and removes pixel assets no longer referenced by a document or version. Legacy recovery records remain readable.

Large local filter jobs can stage a temporary input buffer in private Origin Private File System storage. Workspace settings can instead use the remembered save folder, including a connected external drive, and enforce a 128 MB–8 GB scratch quota. LibreLayer removes completed and cancelled job buffers automatically; **Clean scratch** removes only LibreLayer-prefixed temporary files. If scratch storage is unavailable, the operation continues safely in memory and reports the fallback.

Default save folders and recent external-drive files use the browser’s File System Access permission when supported. A remembered handle is not unrestricted disk access: the browser can prompt again, and LibreLayer cannot use a disconnected drive. Unsupported browsers fall back to Downloads and file pickers.

Password-protected project packages are encrypted locally with AES-256-GCM. Passwords are not stored or recoverable. Encryption protects the exported package, not screenshots, browser memory, unencrypted recovery copies, or already-exported images.

Before any optional cloud or generative provider is added, the UI must disclose the provider, data sent, purpose, retention implications, and whether a local fallback exists; upload must require an explicit user action.
