# 1.2.1 · Portable core and direct-memory Anna worker

App **1.2.1**, tool **0.8.1**. This is the first platform-separation step: one Python rules implementation shared with the existing Anna/CLI adapters and future Web/Android targets. **Test deployment is pending**; the installed version remains 1.2.0 until installation verification completes. Review candidate **1.0.0 / ID 1383** remains unchanged.

## Changes

- Added a storage-free `game_api.transition` returning a candidate state, command result, change flag and history events. Rules, prompts, fixed command time, RNG and ID generation are explicit inputs scoped with ContextVars.
- Importing the portable API no longer reads rule/template files, environment configuration or OS locks. Existing CLI helpers use the lazy `local_runtime` compatibility adapter; administrator operations and cross-user ranking remain outside the portable API.
- Added the `StateRepository` revision/CAS contract, memory/file implementations and a transaction application service. Initial creation and updates must be atomic; storage failure cannot return an uncommitted success.
- Anna now evaluates JSON state directly, without temporary save files or environment mutation. Existing APS receipts, conditional commits, privacy/reset and account isolation stay in place. APS still lacks atomic initial creation; this refactor does not claim to resolve it.
- Created `main` as the shared integration branch and kept existing `release` as the Anna deployment track. Future Web/Android branches await their actual adapters and builds. [Architecture and cost intent](../../docs/ARCHITECTURE.md).

## Validation

Local engine **214 tests (one optional skip)**, storage/protocol **67/67**, JS **82/82** and strict validation passed. New tests cover pure imports, filesystem/system-clock blocking, deterministic transitions, original CLI parity, input preservation, conditional creation/replacement, conflicts, failed storage and fileless Anna execution.

Actual Edge + **Pyodide 314.0.7 / emscripten** smoke passed with only nine shared Python modules: birth, feeding, status, final dungeon item reward and replay. Neither local filesystem adapter nor OS-lock runtime was loaded. This is a core portability check, not a released Web app or a browser storage implementation.

CI source, both platform package hashes, installed app revision and actual running versions will be added after deployment.

## Remaining scope

No Web UI deployment, IndexedDB persistence, BYOK provider integration, service-worker offline cache or Android package is included. Existing gameplay/save formats and item rewards are retained. No review submission, public release, production gameplay or AI calls are part of this verification.
