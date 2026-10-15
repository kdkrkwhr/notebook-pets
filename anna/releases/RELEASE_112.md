# 1.1.2 · Expanded item catalog

App **1.1.2 / ID 1394 / working revision 51**, unchanged game tool **0.7.0 / Executa version 752**. Owner test deployment verified on **2026-10-15 KST**. The installed `0.0.0-draft` matches the immutable cut (`dirty_vs_latest_cut=false`). Adds eight illustrated cosmetics for Sunken Palace and Forgotten Clockwork City, bringing the preview catalog to **24 items** across common gear and five dungeons.

Each new region has a head, neck, back and surrounding-effect design, with Korean/English descriptions, search, region/type filters, rarity, planned acquisition and fit requirements. Coral Pearl Tiara and Little Clockwork Orbit are rare previews. All eight transparent PNG illustrations were generated individually with the built-in image tool and bundled unchanged; browsing requires no AI calls.

Actual collection, purchases, equipment and dungeon rewards are unchanged. No game-tool or saved-data schema changes. The existing 1.0.0 review candidate and shared listing are preserved during owner test deployment.

README guides include current catalog, detail and mobile screenshots made with separate test data. [Items and exact prompts](../ITEMS.md).

## Validation and deployment

- Local JavaScript **81/81**, browser **90/90** and strict manifest validation passed. Expanded tests cover both region filters, Korean/English search and detail labels, all eight new decoded images, mobile fit and unchanged game/storage/AI call counts.
- Inspected the eight alpha-transparent illustrations and actual Korean catalog/detail/360px UI captures. README validation checked nine files, 156 local links/anchors and eleven images.
- Source **`e16c50bf84526597722bc507cb9953f68a142f8d`** passed [Windows/Linux engine CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38708748960). [Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38708749027) also passed on Windows and Linux, including storage/protocol checks, package builds and standalone smoke tests.
- Working revision **51**, immutable cut **1394**, owner draft installation succeeded. Both cached Windows/Linux 0.7.0 packages retain their verified hashes; neither tool code nor package changed. PC and cloud agents both report **agent_version=0.7.0, loaded=true, running=true** after installation.
- Installed UI: **Connected**, no error notice, **24 items**, four per new region, all eight new detail images and all twenty-four catalog illustrations decoded. Twelve installed code/image files returned **HTTP 200** and matched local SHA-256. During concurrent window reloads one status request briefly timed out; the final single-window refresh and verification succeeded.
- All five game/art/chat/walk-story/personality-draft values **and ETags** are unchanged. Shared listing fields, six screenshots, review candidate **1.0.0 / ID 1383** and **pending_review** status match the pre-deployment snapshot. No gameplay actions, walk consumption or production AI calls were made.

## Remaining limits

The catalog remains a preview: no item ownership, collection, purchases, equipment or new dungeon rewards. The existing platform first-creation concurrency limitation remains documented in [FIRST_CREATION.md](../FIRST_CREATION.md). No public release or review resubmission was requested or performed.
