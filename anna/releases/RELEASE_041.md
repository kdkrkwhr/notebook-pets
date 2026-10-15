# Notebuddy 0.4.1 — discover on walks, enter within 24 hours

Test deployment completed on **2026-10-13**: app **0.4.1**, game tool **0.2.1**.

Previously all three dungeon cards and previews were visible before discovery, and the first walk plus every third missed roll guaranteed a discovery. Now every successful walk uses a 25% roll, with no guaranteed first find or pity counter. Only discovered, unexpired dungeons are returned by the game and displayed by the UI. Pixel companions remain available in the growth album.

Each new discovery lasts **24 hours from discovery**, as chosen by the user. Cards and entry previews show a countdown based on server time. Expired entries disappear and the server refuses new entry without spending a charge. Existing recorded expeditions can still be replayed after expiration. The discovered boss keeps its element across midnight; daily reward limits still reset at midnight Korea time. A region already rewarded that day cannot be rediscovered until the next day. Pre-0.4.1 discoveries keep their original midnight deadline, preserving existing saves without extending them.

The exploration dialog uses **96% of the app viewport width and 94% of its height**. Desktop places the large map beside the controls; narrow screens stack them. Expiry disables entry even when the preview is already open.

See [DUNGEONS.md](../docs/DUNGEONS.md) for full rules. Existing pets, portraits, conversations, coins and saved results are retained. The 0.3.4 review candidate and its shared listing must remain intact during test deployment.

## Deployed build

- App 450: immutable **0.4.1**, version ID **1340**, bundle ID **1243**. Working revision **35**, bundle ready, **106 files**. Installed as **0.0.0-draft** through Anna's working-draft install flow.
- Game Executa 1193, `tool-kdkrkwhr-notebuddy-game-hc8mw4gu`: **0.2.1**, frozen version ID **733**.
- Source **4ad86048e10f93343b25d143252692f3bd1d897c**. [Windows/Linux Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38337094133) and [engine CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38337094126) passed. Both deployed binary packages came from that exact Anna CI run.
- Review candidate **0.3.4** remains `pending_review`. Shared listing fields were backed up, restored after cutting 0.4.1, and compared successfully. No review resubmission or public release.

## Verification and limits

- Engine **170**, Anna Python **57**, JavaScript **52**, browser **62** tests and strict manifest validation passed. CI passed on Windows/Linux, including standalone binary smoke tests. Targeted local browser checks covered discovery hiding, live expiry, replay after expiry, automatic movement and the enlarged 360px Korean layout.
- Anna initially skipped runtime replacement with `already_loaded_on_agent`, leaving 0.2.0 running. Removed only this tool's installed executable via the official Agent uninstall endpoint, then installed the working draft again. Final Agent status: server **0.2.1**, agent **0.2.1**, **loaded=true**, **running=true**. Persistent storage was not removed.
- The actual installed app is **Connected**. `style.css`, `app.js`, `dungeon.mjs` and `pixel-pet.mjs` returned HTTP 200. The existing save displays only its discovered Dream Forest, with a ticking countdown; the other two cards are absent. Pixel preparation is in the growth album.
- Opened the real Dream Forest preview without entering: **1073×716** dialog in a **1118×762** app viewport, approximately 96%×94%; map width **685px**. Closed the preview after checking. No walk charge, combat, reset or paid AI request was used.
- Before/after game, portrait-index and chat values and etags are identical. The existing pre-0.4.1 Dream Forest keeps its original midnight deadline because its save has no discovery timestamp. Newly discovered regions use 24 hours from discovery.
- Expiry, midnight boundaries, discovery probability and result replay were tested with controlled clocks/RNG and isolated browser fixtures; no real 24-hour wait or new live expedition was performed. Artwork and balance limitations remain documented in [DUNGEONS.md](../docs/DUNGEONS.md).

Private storage snapshots, diagnostic scripts and mobile preview captures remain in ignored `.local/`.
