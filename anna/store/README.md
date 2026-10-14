# Store screenshots — 1.0.0

Captured on **2026-10-14** from the 1.0.0 UI bundle, using isolated views produced by the actual Python game worker. The featured companion **Mori** is the actual Anna-generated result of the original sprout doodle shown in the editor. The screenshots are browser captures, not generated UI mockups. Listing order:

1. `02-companion-and-care.png`: **Mori after drawing → Anna analysis → portrait generation**, conversation area and care controls in the notebook theme, 1280 × 1000.
2. `00-title.png`: the title screen shown on every load, with the bundled starter portraits, 1280 × 900.
3. `04-draw-your-companion.png`: the same sprout reference entered through the real drawing editor's pointer controls, 1280 × 1000.
4. `05-pixel-dungeon.png`: actual discovered-dungeon preview and the current companion's pixel silhouette, 1280 × 900. Entry is not pressed.
5. `06-item-book.png`: the item book preview with its Items / Growth album tabs, opened from Mori's home, 1280 × 1000.
6. `03-care-and-album.png`: daily quests, growth album, pixel appearance and the item book entry, 1280 × 850.
7. `01-first-meeting.png`: the new-companion form with its three-step guide, 1280 × 1000.

`demo/reference.png` was drawn with `scripts/store_drawing.mjs`. The unmodified app functions `checkArtwork` and `birthPrompt` supplied the normal analysis and generation requests to Anna. Anna returned **plant / nature**, the portrait in `demo/portrait.png`, and a personality using the unchanged `personalityPrompt`/`parsePersonality` flow. Preparation used **three Anna AI calls**: one analysis, one image generation, one personality initialization. `demo/provenance.json` records their results and image hashes, without credentials or signed URLs. The pixel portrait is the existing app's local conversion of this same generated portrait.

`scripts/store_fixture.py` creates disposable games with those analyzed birth traits, commits the real generated personality through the engine, and performs walk commands until a dungeon is discovered. Game values are not manually edited. `scripts/capture_store.mjs` serves the shipped files in a network-isolated browser with read-only host responses and the recorded art. Capture makes **no additional AI calls or production storage calls**, and no real user's data is changed. Chat is empty; no conversation is fabricated. These captures do not certify native installation or production persistence.

Reproduce from `anna/` with `node scripts/capture_store.mjs` after preparing the existing assets and dependencies. This reuses the recorded Anna outputs, checks the recorded reference and portrait hashes, and refuses a starter-image fallback. The editor redraw is compared with the analyzed reference pixel by pixel (at most 2% of inked pixels may differ, since the editor's on-screen layout can shift stroke rasterization); the 1.0.0 capture differed on 0.0%. The randomly discovered dungeon may differ on a recapture. All seven images were visually checked before metadata synchronization. `app.json` references the local files in display order; Anna CLI uploads them through the official listing screenshot API.

Earlier sets: the 0.8.1 listing used five captures of the previous UI; installed-runtime verification for each version is recorded in its release notes.
