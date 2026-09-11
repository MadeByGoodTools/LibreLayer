# Project migration and compatibility policy

LibreLayer project packages carry an explicit format marker and checksum. Current builds write `.librelayer`; existing `pixel-studio-project` / `.pixelstudio` packages remain readable and are identified as legacy rather than silently rewritten.

New readers must preserve unknown data where practical and reject an unsupported required feature with a clear error. They must never claim checksum verification for legacy packages that did not contain one. A successful open does not overwrite the source. Saving creates a current-format package chosen by the user.

Project-schema changes must be additive when possible. A breaking change requires a new format version, fixture coverage for the previous readable version, documented migration behavior, and a release-note entry. Removing the last reader for an older format requires a separately available converter and advance notice.

PSD/PSB and other exchange formats are governed by the format matrix rather than native-project guarantees. Unsupported external content must produce a compatibility report or explicit flattened-preview choice; it must not be silently discarded.

Each release candidate must pass current and legacy package fixtures, changed-checksum rejection, encrypted-package round-trip, and browser reopen/recovery checks before the supported-version claim changes.
