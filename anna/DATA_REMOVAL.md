Latest change: **0.3.1 / tool 0.1.11** adds explicit new-companion restart after removal. Deleted records are not recovered. See [restart behavior](RESTART_AFTER_REMOVAL.md). Older permanent-no-restart descriptions and the 0.3.0 candidate below are historical; deployed 0.2.1 is unchanged.

# Data removal contract — private preview

App/tool 0.1.6. This flow removes existing Notebuddy game content; it is not a reset, reroll or account-wide deletion.

## Ordered flow

1. `privacy/inspect` reads only existence, removal status and ETag in the authenticated tool scope. Neither a user ID nor arbitrary keys/scopes can be supplied.
2. The UI requires the exact phrase `DELETE NOTEBUDDY` and acknowledgment that other windows and requests have stopped. The user can cancel. The privacy tool also requires that phrase and the preview ETag; this is an application confirmation, not cryptographic proof of a human click.
3. `privacy/erase` conditionally replaces the existing game document with `{ "_notebuddy_erased": 1 }`. A changed ETag refuses removal; no automatic re-preview/reconfirmation occurs. Missing games are refused, never unconditionally initialized. Repeating an uncertain successful removal is safe.
4. Every normal game command detects the marker before evaluating game rules. Old receipts are gone, and replay/start cannot create a new companion. Earlier adapters reject this marker as an invalid engine save; do not downgrade or manually remove the marker to reset a game.
5. After the server confirms removal, the UI clears its in-memory name/chat/portrait references and replaces only `notebuddy/chat-v1` and `notebuddy/art-v1` with the same minimal marker. New merge writers reject these markers and existing writes use ETags. The browser language preference is removed after cleanup.
6. The UI lists only app files under `portraits/`, including replaced portraits, and deletes each using its ETag. It rereads the first page after each batch, stops after 20 batches of 100, and checks the KV markers plus an empty file list before reporting “Cleanup checked”. No bucket-wide, user-scope or other-app deletion exists.

## Failure and concurrency limits

- Game removal and app cleanup are not one distributed transaction. Game removal can succeed while chat/files remain; the ended-game screen always offers cleanup retry, including after reopening.
- Failed/ambiguous erasure is not reported as success. Gameplay is disabled in that window until the user resolves the result. A failed cleanup never claims the file list is empty.
- An already-existing conditional game or chat writer cannot overwrite a marker with its old ETag. After a conflict the new client reads the marker and stops.
- Anna has no atomic create-if-absent. A previously queued unconditional first writer can still land after a marker. Old UI clients may also merge over app markers without understanding them, and pending uploads may finalize later. Closing other windows and stopping requests is an operational precondition, not a proven global cancellation barrier. These remain known limitations. On 2026-10-09 the owner accepted submission without waiting for undocumented platform capabilities; this does not establish safe deletion under these concurrent-write scenarios.
- File lists may exclude pending uploads. An empty list proves only the entries visible during that check. Stop uploads and retry. Existing download URLs, platform/provider logs, soft-deletion retention and backups are outside this flow.
- Markers remain account-associated APS records. Do not call them anonymous, claim zero retained data, or offer “complete account deletion”. The missing-game case and removal of markers require a separately authenticated platform-supported route.

## Verification

Automated coverage includes explicit confirmation, stale preview, missing-save refusal, delayed existing game write, old replay/start rejection, marker preservation, conditional chat conflict, partial cleanup retry, portrait prefix isolation, malformed lists, missing ETags and bounded work. The real-user companion must never be erased for testing. Use separate app/tool IDs and assert a dedicated test companion identity before destructive integration checks.

Live platform validation and deployment evidence are recorded in `HANDOFF.md`. Unit tests are not evidence that platform physical erasure or cross-device cancellation works.

## Real APS integration check — 2026-10-09

The dedicated app `notebuddy-erasure-check` and private tool `tool-kdkrkwhr-notebuddy-removal-check-4jjcjsab` were used, with an identity guard requiring the test name `Deletion verification`. The production app 450 and its tool were not targets. A real game, a temporary chat entry, and two SVG fixture portraits (one replaced) were created. The UI rejected missing confirmation; cancel preserved the game. Confirmed removal left only the game/chat/index markers, listed zero portrait files, rejected another start, and remained ended after cleanup retry and refresh. No paid AI call was made.

Test harness constraints: Anna CLI 0.1.57's app harness omits `executa_tool_id` in storage-token minting, causing `scope=tool` to select an unregistered synthetic `dev-<slug>` owner. A workspace-only test launcher supplied the actual registered private test tool ID through the same field used by the CLI's standalone Executa bridge. No ACL or production code was disabled. Localhost-origin signed file PUTs were blocked in the browser; Node uploaded only the fixture bytes using the issued URLs, then the normal app SDK finalized them. Deletion/listing/conditional writes were real APS calls. These checks establish the existing-game removal path; they do not close the first-write, old-client, pending-upload or physical-retention limitations above.
