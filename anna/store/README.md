# Store screenshots — 0.8.1

Captured on **2026-10-14** from the unchanged 0.8.1 UI bundle, using isolated views produced by the actual Python game worker. No production account, Anna storage, paid AI request or fabricated AI conversation was used. `capture.json` records the version and demonstration companion. The screenshots are browser captures, not generated UI mockups.

- `01-first-meeting.png`: first meeting and random/drawing/photo selection, 1280 × 1000.
- `02-companion-and-care.png`: demonstration companion **Mori**, conversation area and care controls, 1280 × 1000.
- `03-care-and-album.png`: daily quests, growth album and pixel preparation, 1280 × 850.
- `04-draw-your-companion.png`: reference editor with a sketch drawn through its real pointer controls, 1280 × 1000.
- `05-pixel-dungeon.png`: actual discovered-dungeon preview and the current companion's pixel silhouette, 1280 × 900. Entry is not pressed.

`scripts/store_fixture.py` creates disposable games and performs real walk commands until a dungeon is discovered. The game values are not manually edited. `scripts/capture_store.mjs` serves the shipped files in a network-isolated browser with read-only host responses; it does not certify Anna installation, AI quality or production persistence. The personality is not initialized and chat is empty, so no model-generated result is implied.

Reproduce from `anna/` with `node scripts/capture_store.mjs` after preparing the existing assets and dependencies. The random demonstration companion may differ on a recapture. All five images were visually checked before metadata synchronization. `app.json` references the local files; Anna CLI uploads them through the official listing screenshot API.

The earlier screenshots were from 0.2.1 and have been replaced. Installed-runtime and persistence verification are recorded separately in [0.8.1 release notes](../RELEASE_081.md).
