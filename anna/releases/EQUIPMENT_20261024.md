# Gated item fitting · 2026-10-24 · source-only change

Anna `release` implementation; no version bump, deployment or review submission. Baseline: `a9b6843d6d7716b7a19e5ab8dd94fd18ced6bc26`. Both GitHub workflows triggered by `release` pushes run checks/builds only and do not deploy Anna. No force push or release-web update.

Implemented: per-companion item fitting reservation, single-reference edit adapter, durable local/file recovery, explicit preview/application, uploaded-file verification and atomic portrait-pointer/item/receipt commit. Discovered items remain recorded after consumption. Existing reward eligibility remains unchanged. Pending cancellation is not unequip/refund. Frontend and tool gates are both off; `image.edit` is not added to the app manifest. [Design, API evidence and release limits](../docs/EQUIPMENT.md).

Local validation on Linux:

| Check | Result |
| --- | --- |
| Shared Python regression + MCP | 234 passed |
| Engine self-check | 6 passed |
| Anna JS | 106 passed |
| Anna storage/protocol | 79 passed |
| Browser mocks, Chromium | 138 passed |
| Focused fitting browser suite after UI review | 3 passed |
| Pyodide real browser core, including fitting | passed |
| Strict Anna manifest validation | passed |
| Locked Linux Executa build and binary smoke, including fitting | passed |
| Dependency compatibility / MCP import / diff whitespace | passed |

The new tests cover duplicate clicks, game/ART conflicts, failed upload/save, journal-write/download recovery, response loss, reload, cancellation, preview/source changes, missing stored files, stable request replay, discovery history and default-off behavior. The first adapter run caught stale generated distribution metadata; the builder synchronized it and all 79 adapter tests then passed. The first Pyodide run lacked installed dependencies; locked dependencies were installed and its new module list corrected. Neither issue is left unresolved.

CI for the exact pushed SHA is reported in the task result. Local checks are not a claim of Windows execution or installed Anna behavior. Live image calls: **0**. Production data changes: **0**. New credentials, platform grants and security-setting changes: **0**.

Before activation: decide whether single-portrait/text-described items meet the intended pre-made item composition quality, validate attachment/identity and platform concurrency with separately authorized bounded live tests, approve `image.edit` permission, and version/deploy the matching app/tool explicitly. Provider-response loss before local/file capture cannot be made recoverable without an additional provider contract; current behavior preserves item/portrait and prohibits automatic paid retries. See the design document for device-local and cross-store limits.
