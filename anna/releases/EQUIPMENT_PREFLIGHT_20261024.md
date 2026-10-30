# Item fitting Windows preflight - 2026-10-24 - deployment blocked

Baseline source: `6e73f114ab56e64f16674046492b69e35d6d54e3`, checked out separately on Windows. The original checkout remains at `a9b6843` with its untracked `web/` preserved.

The user approved adding `image.edit` specifically for Notebuddy item fitting and continuing through real testing, fixes, deployment and review. Live tests are limited to **4 calls, one image each, zero text calls**, with **no automatic paid retry, additional payment or auto-recharge**. A live request remains blocked unless the existing allowance/prepaid balance and absence of extra charges can be verified.

## Source change

The source manifest adds only `edit` beside the existing `generate` method. Strict schema/ACL validation passes. Both `EQUIPMENT_ENABLED` gates remain **false** pending real image quality and platform tests. Versions stay **1.4.16 / tool 0.9.7**. No production manifest, working draft, platform grant, installation or review candidate was changed. This is a source-only update; the commit and CI results are reported separately.

Before the source push, both repository workflows were inspected. They run tests, validation, standalone builds and artifact retention with `contents: read`; neither publishes Anna packages, pushes an Anna working draft, cuts/releases a version, changes platform grants or deploys the public web site. The source declaration takes effect on Anna only through a later separately verified deployment.

## Windows validation

| Check | Result |
| --- | --- |
| Python regression with real local stdio MCP | 234 passed |
| Engine self-check | 6 passed |
| Anna JavaScript | 106 passed |
| Anna storage/protocol adapter | 79 passed |
| Headless Chromium UI with local routes and mock SDK | 138 passed |
| Real browser Pyodide portable core, including fitting/replay | passed |
| Current manifest and proposed image.edit declaration, strict schema/ACL | passed |
| Windows Executa locked build and standalone smoke, including fitting | passed |
| Isolated MCP dependencies | 30 packages compatible |
| Diff whitespace | passed |

The initial sandboxed runs could not resolve package hosts, spawn some Python workers, or launch the installed browser; their logs are environmental failures, not passing evidence. Dependencies were installed in the separate task workspace and the same tests were rerun with the required process/network access. Final passing evidence is in `python-regression-unrestricted.log`, `engine-self-check.log`, `anna-js.log`, `anna-plugin-unrestricted.log`, `anna-browser-unrestricted.log`, `pyodide-smoke.log`, `manifest-edit-validation.log` and `windows-build.log` in the task folder above the checkout. All test image transports are fake or localhost; no Anna AI endpoint was called. The temporary browser profiles never access the user's existing browser session or the stopped CUA path.

Generated Windows archive: `executas/notebuddy/dist/notebuddy-game-0.9.7-windows-x86_64.tar.gz`, **9,710,958 bytes**, SHA-256 `31c77a6cdb84cb916bbfed03dd564dc219fbf132b385b79f926c96a9ed33a4c7`. This is a gated baseline test package, not a final activated release or deployed package. No Linux build was performed on this PC in this follow-up.

## Current server, read-only

- Existing CLI 0.1.57 authentication works without new credentials. Developer API resolves `@kdkrkwhr/notebuddy`, app450, developer handle `kdkrkwhr`.
- Working revision **92**, bundle **ready**, `dirty_vs_latest_cut:false`.
- Public latest **1.4.13 / ID1446**; current review candidate **1.4.16 / ID1587 / pending**. Neither was changed.
- Owner grant reports `allowEdit:true`, `maxPerCallEdit:1`, `maxImages:1000`, `maxImagesPerDay:1000`. The deployed manifest still declares only `generate`. Grant limits do not establish the account's remaining balance or monetary cap.
- Reported installed app version is `0.0.0-draft`. Actual running installed UI/tool behavior was not verified in this follow-up.

## Billing and live-test blocker

The [Anna team response on October 23](https://forum.anna.partners/t/image-edit-fails-with-provider-errors-readerror-and-fal-ai-image-to-image-404/400/2) was re-read through the public topic JSON API. It confirms the current `fal-ai/nano-banana-2` single-image edit contract and says failed edits do not consume allowance; successful edits do. It does not establish this account's current included balance, exact successful-edit price, overage behavior or auto-recharge settings.

The public pricing URL returned **401**; the attempted public image-doc/index URLs and OpenAPI URL returned **404**. The installed CLI exposes no billing/balance read command. The earlier Windows CUA URL-identification safety stop remains in force for the user-browser task; it was not retried or bypassed. Further price-path exploration has stopped.

**Live calls: 0 images / 0 text. Anna-side writes, new credentials, security changes and grant changes: 0.** Because the no-extra-payment condition cannot yet be established, live image quality, actual multi-window platform behavior, activation, new versioning, Anna deployment and release review submission remain blocked. Broad approval is already present; the missing prerequisite is verifiable account billing information, not another general approval.
