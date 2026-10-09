# New-companion reset · app 0.1.10 / tool 0.1.8

User-approved product change: keep one pet at a time, but allow an explicit fresh start. Both species and element are drawn again by the original engine; same combinations remain possible. New name is entered before confirmation. Old progress, chat and all portraits are cleared. No AI call runs automatically.

## Protocol

`reset/inspect` previews the existing save ETag. `reset/begin` requires exact `RESET NOTEBUDDY`, that ETag, a stable UUID reset ID and new name. It validates the old game, creates one candidate, drops old receipts and increments the request sequence. A conditional write stores `{_notebuddy_reset: 1, reset_id, game}`. Normal game calls return `reset_pending`; old engines reject the marker. The pending candidate contains only the new game, not an old-save backup.

The UI clears CHAT/ART to empty values and deletes app `portraits/` files with ETags. It checks the same pending reset ID before writes/deletes. It reads each KV before that check so an intervening committed writer changes the ETag. Cleanup is bounded and never reports completion on failed storage. `reset/finish` conditionally unwraps the same candidate into the standard envelope. `_anna_reset_id` remains in the new game; matching begin/finish retries return completed without changing new progress. Actions from the old sequence expire. A different reset ID cannot finish a pending reset.

Privacy erase remains irreversible and reset refuses its tombstone. Missing/corrupt saves and stale previews are refused. Reset does not modify the Discord engine or local Discord save files. The user’s real companion must not be reset for testing.

## Limits

The tool cannot read app-scoped chat/files. Finish is trusted UI orchestration, not a server-verified cross-scope transaction; tool-only clients must not call finish without completing app cleanup. Close all other clients/requests before reset. Existing conditional game writers cannot restore old progress, but legacy/previously-running chat or image writers are not globally cancelled. Missing app rows retain the known unconditional first-write race. Reset does not resolve the first-creation launch blocker, provider/platform retention, physical file erasure or signed URL revocation. Old UI versions need an update to display pending-reset recovery.

## Validation

Python reset tests cover fresh identity and zero XP, confirmation/cancel boundary, stale ETags, privacy tombstone/missing/corrupt save refusal, pending-game block, old event expiration, competing resets, lost begin/finish replies and preservation of new progress. JSON-RPC tests check reset routing and authenticated storage context. Node checks cleanup ordering, interruption/resume and scope rejection. Browser tests exercise confirmation, cancel, response loss, blocked gameplay, reopen/resume and no AI calls. Mock browser results do not establish real Anna atomicity.
