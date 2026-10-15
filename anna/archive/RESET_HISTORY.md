> 과거 기록입니다. 현재 설치·배포 상태는 [최신 인계](../HANDOFF.md)를 확인하세요.

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

## Private deployment verification

The superseded app 0.1.9/tool 0.1.7 failed runner startup because reset parameters lacked descriptions, despite schema validation passing. App 0.1.10/tool 0.1.8 adds those descriptions and a regression assertion for every tool parameter. Do not install the superseded candidate.

App 0.1.10 (ID 1205), tool 0.1.8 (Executa version 686), draft revision 12, 98 UI files. CI source `e3b7bd7`: [Anna Windows/Linux](https://github.com/kdkrkwhr/notebook-pets/actions/runs/37932202883), [engine](https://github.com/kdkrkwhr/notebook-pets/actions/runs/37932202726). Passed 29 Node, 13 browser and 46 Python tests plus strict validation. Uploaded both tested standalone tool packages from that successful run.

The installed private app connected and restored 모찌 at 10 XP, four chat messages and the portrait. Opened the reset preview (real reset/inspect) and cancelled. The real partner was not reset, no old files removed and no AI calls made. This is a read-only production smoke test, not destructive end-to-end reset evidence. No review submission or public release.


---

# Confirmed restart


Incremental candidate 0.2.2 / tool 0.1.12: backports only confirmed restart and its visible Start over button onto deployed 0.2.1. New portrait analysis, artwork birth, care reactions and walk recharge remain on develop and are not included. Deployment verification is pending.

Use Start over in the game or ended-game screen. Enter a new name, close other windows, and confirm RESET NOTEBUDDY. Cleanup completes before the new companion is released. Deleted records are not restored.


---

# Restart to welcome screen — 0.2.7 / tool 0.1.14

Start over confirms removal of the current companion, chat and portraits, then returns to the ordinary first-meeting screen. No name is requested in the reset dialog and no new species or element is selected during cleanup. The user chooses a name and Random or Drawing afterward.

Cleanup retains its interrupted-reset barrier. The completed reset retains a minimal welcome marker, reset receipt and fresh request epoch. The next explicit start uses a conditional write against this existing row; late old actions cannot create or replace the new companion. Retrying a completed reset cannot clear a newly started game. Old clients may still pass a name for compatibility, while the current UI omits it.

This patch is based on the working 0.2.5 release. Direct evolution image editing is not included. The existing review candidate remains 0.2.5 until explicitly replaced; testing this patch must not reset a real player's data automatically.

Verification: 52 server tests, 41 browser tests and all UI unit tests passed. Linux and Windows CI packages passed in run 38061043894 (source 3b67289). Working revision 27 is ready. Immutable candidate 0.2.7 is version 1253, tool 0.1.14 is Executa version 706. After apps cut uploaded the binary packages, working install confirmed agent_version 0.1.14 loaded. A deliberately invalid confirmation was rejected by the new name-optional handler without data mutation. Review remains pending_review on 0.2.5; no review replacement or public release was performed.
