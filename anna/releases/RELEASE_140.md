# 1.4.0 — My little home

App **1.4.0**, tool **0.9.0**. Owner test deployment verified: **app ID 1403 / working revision 54**, Executa **758**. Installed as `0.0.0-draft`, `dirty_vs_latest_cut=false`. Public review candidate 1.0.0 is preserved.

Users buy furniture with game coins; their companion chooses placement based on its saved personality. A separate 2D room renders walls, floor, twelve furniture sprites and the existing pet artwork. Buying leaves furniture in storage. Only explicit **Decorate** makes one bounded LLM request (maximum 160 output tokens), choosing among core-validated candidates. Walking, carrying furniture, idle movement, undo and save-only retry make no AI requests.

The pure Python core owns prices, coins, ownership, geometry, entrance clearance, reachable transport paths and stale revision protection. AI cannot invent coordinates or currency. One request places at most three stored objects. Invalid AI responses leave the room intact; an uncertain save retries the same action without generating again. The previous layout can be restored while retaining purchased furniture. Existing pet, portraits, conversations, rewards and stats are preserved.

Scope: one room, free nest plus eleven purchasable objects, original hand-painted sprite atlas. Character movement uses the existing portrait with motion effects rather than directional walking sprites. No manual placement, new generated room images, recurring AI, gameplay bonuses, or public release. Web home integration is outside this Anna release.

## Validation and deployment

- Deployed implementation: **`f53e7bc`**. [Core CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38761143332) at `9c3d6947fe533c6996accbcad8a21033d473f80b` passed Windows/Linux regression and real-browser Pyodide purchase, layout application and replay without loading filesystem adapters. [Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38761143190) passed both operating systems: **84 JS / 93 browser / 70 storage-protocol** tests, strict validation and standalone executable purchase/apply/replay plus dungeon reward checks. Root regression: **221 tests** (local optional locale check: one skip).
- Windows/Linux packages came directly from that successful Anna CI. The subsequent UI-only wall-sprite height adjustment at `f53e7bc` passed both focused home browser tests locally; it does not change either executable. Six installed UI/art files returned HTTP 200 and matched local SHA-256 values after deployment.
- `apps push` revision **54**, cut **1.4.0 / ID 1403**, frozen tool **0.9.0 / Executa version 758**, bundle **1301 / 160 files**. Bundle SHA-256 manifest: `036107011bbd39a3e6ffedcd82293fee16ea97529b7ff0d896a5553702af4a86`.
- Installed on cloud and PC. Both report **agent_version=0.9.0 / agent_loaded=true / agent_running=true**. The temporary Windows default was restored to the original cloud agent. The actual installed iframe connects, opens My home, renders twelve shop cards and the existing crowned/pendant portrait in the room. Home revision remains zero, with the free nest and **24 coins**.
- Game ETag is unchanged (`19b8f4b366536837764b355cecb641c8`). Art, chat, walk-story and personality-draft values and ETags all match their pre-deployment snapshots. No production purchase, paid Decorate call, reset or other gameplay action was performed. The one-call AI contract was tested with a mock provider and real Python rules, rather than spending the user's allowance.
- Shared listing fields and six original screenshot URLs are identical. Review candidate **1.0.0 / ID 1383 / pending_review** remains intact. No review submission or public publication occurred. CLI upload temporarily reused original CDN screenshot URLs and restored local source metadata afterward.
- Documentation links: **445 checked, zero missing targets** before final release evidence update.

| Tested package | SHA-256 |
| --- | --- |

| windows x86_64 | `e6cca20cd1d7f1d2db8de8e0f8776182122a8c79d291dbaa586c4c1172fe32e7` |
| linux x86_64 | `ea09d5673370a0828f5631c01c4c886134cd2134ff259573e0ecbb79033972ae` |

Remaining limits: portrait-based character motion, bounded candidate layouts rather than unrestricted rearrangement, one room and eleven purchasable furniture types. Existing APS first-creation atomicity limits remain. Home UI has not been ported to `release-web` in this Anna task.
