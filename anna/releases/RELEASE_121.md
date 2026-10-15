# 1.2.1 · Portable core and direct-memory Anna worker

App **1.2.1**, tool **0.8.1**. This is the first platform-separation step: one Python rules implementation shared with the existing Anna/CLI adapters and future Web/Android targets. Owner test deployment is verified: **app ID 1402 / working revision 53**, **Executa version 757**. Installed as `0.0.0-draft` with `dirty_vs_latest_cut=false`. Review candidate **1.0.0 / ID 1383 / pending_review** remains unchanged.

## Changes

- Added a storage-free `game_api.transition` returning a candidate state, command result, change flag and history events. Rules, prompts, fixed command time, RNG and ID generation are explicit inputs scoped with ContextVars.
- Importing the portable API no longer reads rule/template files, environment configuration or OS locks. Existing CLI helpers use the lazy `local_runtime` compatibility adapter; administrator operations and cross-user ranking remain outside the portable API.
- Added the `StateRepository` revision/CAS contract, memory/file implementations and a transaction application service. Initial creation and updates must be atomic; storage failure cannot return an uncommitted success.
- Anna now evaluates JSON state directly, without temporary save files or environment mutation. Existing APS receipts, conditional commits, privacy/reset and account isolation stay in place. APS still lacks atomic initial creation; this refactor does not claim to resolve it.
- Created `main` as the shared integration branch and kept existing `release` as the Anna deployment track. Future Web/Android branches await their actual adapters and builds. [Architecture and cost intent](../../docs/ARCHITECTURE.md).

## Validation

Local engine **214 tests (one optional skip)**, storage/protocol **67/67**, JS **82/82** and strict validation passed. New tests cover pure imports, filesystem/system-clock blocking, deterministic transitions, original CLI parity, input preservation, conditional creation/replacement, conflicts, failed storage and fileless Anna execution.

Actual Edge + **Pyodide 314.0.7 / emscripten** smoke passed with only nine shared Python modules: birth, feeding, status, final dungeon item reward and replay. Neither local filesystem adapter nor OS-lock runtime was loaded. This is a core portability check, not a released Web app or a browser storage implementation.

## CI and installed verification

Source **`506e1f141b02a615d44a60ef5c97cf61a5ff9d87`** is shared by `main` and the Anna `release` track. [Core CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38744733520) passed Windows/Linux regressions plus real-browser Pyodide. [Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38744733885) passed both platforms, including **91/91 browser**, **67/67 storage/protocol**, binary build and actual standalone reward/replay smoke tests. The tested CI artifacts were used for deployment.

- `apps push` revision 53 / ready bundle; `apps cut 1.2.1` ID 1402 / tool 0.8.1 version 757. Both cloud and PC working-draft installations succeeded. Each reports **agent_version=0.8.1 / agent_loaded=true / agent_running=true**. The temporary Windows default was restored to the original cloud agent.
- The actual installed iframe connects, shows no error notice, decodes the existing portrait and displays all twenty-four item cards. UI bytes are unchanged: five installed JS/CSS files returned HTTP 200 and matched local hashes. Frozen bundle ID 1300 has the same SHA-256 manifest `c55eca608234074c8ef988895a81b32c19dd37f1fa11496d4e27adc79e628e23` as 1.2.0.
- Game ETag and the values/ETags of all four app records (chat, art, walk story, personality draft) match the pre-deployment snapshot. No user state was reset or migrated by read-only validation. No production game actions, walk use or paid AI requests were performed.
- Shared listing fields, six existing screenshot URLs and review status match the original snapshot. During push only, the local metadata used the existing CDN screenshot URLs to avoid reuploads; the source `app.json` bytes were restored afterward. No review replacement or publication occurred.

| Tested package | SHA-256 |
| --- | --- |
| Windows x86_64 | `f3ab5035b5ce046ab02e10fca941b25e8d54630ab2c9032af1b32f4e8298db83` |
| Linux x86_64 | `e19050c746a3be5e383c61be3c47407a42a18d186fc4024711ecb18513a818bc` |

## Remaining scope

No Web UI deployment, IndexedDB persistence, BYOK provider integration, service-worker offline cache or Android package is included. Existing gameplay/save formats and item rewards are retained. No review submission, public release, production gameplay or AI calls are part of this verification.
