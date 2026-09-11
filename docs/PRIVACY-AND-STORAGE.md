# Privacy and local storage

LibreLayer’s editor is local-first. Image pixels, layered projects, recovery records, preferences, imported LUTs, and local AI-assisted selection work stay in the browser unless the user explicitly downloads, shares, or later chooses a clearly labelled cloud feature.

The web host receives ordinary page requests. The editor does not send open document contents to Good Tools. Browser extensions, operating-system services, downloaded third-party fonts, and a user-selected future AI provider have their own privacy boundaries; LibreLayer must not describe those services as local.

Browser-profile storage includes preferences, open-workspace recovery, dated versions, recent-file handles, retained RAW source assets, and saved default-directory handles. The browser may revoke file-system permission or clear local data. “Protect local working storage” requests persistent storage but cannot replace backups.

Default save folders and recent external-drive files use the browser’s File System Access permission when supported. A remembered handle is not unrestricted disk access: the browser can prompt again, and LibreLayer cannot use a disconnected drive. Unsupported browsers fall back to Downloads and file pickers.

Password-protected project packages are encrypted locally with AES-256-GCM. Passwords are not stored or recoverable. Encryption protects the exported package, not screenshots, browser memory, unencrypted recovery copies, or already-exported images.

Before any optional cloud or generative provider is added, the UI must disclose the provider, data sent, purpose, retention implications, and whether a local fallback exists; upload must require an explicit user action.
