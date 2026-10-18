# Stability verification — 2026-10-18

Scope: the owner requested rapid clicks, lost replies, concurrent windows and interrupted saves. Tests used the release UI, two independent CLI/Python tool processes and a fresh isolated Anna APS app/tool. Production pet, artwork and conversation data were never used as mutation fixtures. Web and the current review candidate are excluded.

## Results

All 14 scenarios passed after correcting one real conflict-response handling defect:

| Scenario | Verified result |
| --- | --- |
| 12 rapid care clicks | One request and one food/reward change |
| Care reply lost after commit | Same request ID replayed; no second reward |
| Connection lost before sending | No state change; explicit retry applied once |
| Window closed after server commit | Reopened state restored the single action |
| Independent runners perform concurrent care | One accepted; stale request rejected with refreshed state |
| Same attendance ID arrives at two runners | One gift; the other response replays the receipt |
| Two windows buy the same item | One charge and one owned item |
| Eight purchase clicks plus lost acknowledgement | Same receipt retry; no duplicate charge |
| Real APS ETag conflict on app records | Both updates retained after merge/retry |
| Portrait upload interrupted after image receipt | Save-only retry reused the received bytes |
| Portrait index acknowledgement lost | Reopening restored the already saved portrait |
| Home sheet upload interrupted | Save-only retry restored the existing 16-frame sheet |
| Window closed during home image response | Portrait retained; default shown; no automatic regeneration |
| Different evolution routes selected concurrently | One stage advance and one history entry; stale choice rejected |

The automated Playwright `pageerror` collections were empty. The development host separately logged `ResizeObserver loop completed with undelivered notifications` during repeated opening; no failed action or lost data was observed from that warning. The proxy blocked all external AI transport: **zero new provider calls and zero unexpected AI attempts**. Image tests replayed four previously paid image results locally; they did not test fresh provider availability or image quality. Evolution used saved fixture options and disabled drawing.

## Defect and correction

An actual concurrent APS write returned RPC `-32603` wrapping `storage.set HTTP 412` and a structured `detail.error.code: precondition_failed`. The adapter recognized only the SDK's direct conflict code. State remained protected, but the losing window saw a generic storage failure instead of the refreshed stale-request response.

Tool **0.9.5** recognizes that exact wrapped write-conflict structure as well as the direct SDK code. Game, reset and privacy use the shared recognizer. Other HTTP failures, quotas, read errors and malformed payloads retain their original error behavior. Requests are never automatically assigned a new action sequence. Regression coverage exercises winner preservation, stale-action rejection and unrelated-error rejection. The app dependency now requires 0.9.5 so a stale runner is not silently accepted.

## Remaining limits

- [Simultaneous first-ever creation](FIRST_CREATION.md) remains unsafe across independent agents because supported APS storage has no atomic create-if-absent operation. The deterministic offline probe still reproduces replacement of the first partner/progress; its intentional exit code is 1. The 14 passing cases above operate on an existing save and do not close that limitation.
- These are controlled failure schedules, not an exhaustive proof of every interruption or long-duration load condition.
- Physical Windows runner and fresh paid image-provider behavior were not exercised in this task. Both OS package checks and owner cloud installation are recorded in the handoff/release notes.
- The review candidate and public web must remain unchanged. Test data and detailed private logs are retained under ignored `.local/stability-audit/`.

## Validation and deployment

Code **e46f542 / f2f79ee**. Windows/Linux CI **39110144833** passed on both platforms: JS **92**, browser **122**, storage/protocol **73**, strict manifest validation and standalone executable build/smoke checks. Shared CI **39110144817** passed all three jobs. An initial CI run caught an app dependency still requiring 0.9.4; corrected it before deployment and used only the successful run's artifacts.

Owner test app **1.4.11 / working revision 82 / installed 0.0.0-draft**; actual cloud tool **0.9.5 / Executa 774 / master 1193**, loaded and running. Explicitly published both tested OS archives, restored the exact protocol storage declaration after platform normalization, pushed the UI working draft, installed and reinstalled the cloud runner, then reopened the actual owner app. Connected, no notice, six installed UI source hashes match. Working content hash: `f42216aff79421d50dca702cdc330e8fdeb6c7e287ab7fd695a43c02ec85814d`.

Registry archive SHA-256 values match CI artifacts:

- Linux: `c23b972d7a525a5cdda57b6b11cec76895cb2d62c4d488a8d67ac0cfa8c07f19`
- Windows: `35d1d2ef03707469e40c7e7b38f37f54c33a72fa3a73f1e22f76fa752b4cd4a0`

Direct independent CDN byte verification was blocked by HTTP 403 (browser fetch also refused); this is a verification limit, not a failed owner cloud installation. Actual runner version and read-only game RPC were verified successfully.

Production game inspection ETag and artwork/chat/story/personality values and ETags remain unchanged. All listing fields and the complete frozen review row are unchanged: **1.4.11 / ID 1443 / pending_review**, still requiring frozen tool **0.9.4**. No review submission, app cut, public Anna release, web merge/deployment or new paid AI request. Isolated test servers were stopped after the checks; disposable APS evidence was retained.
