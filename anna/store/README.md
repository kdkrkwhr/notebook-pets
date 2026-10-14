# Store screenshots — 0.8.1

Captured on **2026-10-14** from the unchanged 0.8.1 UI bundle, using isolated views produced by the actual Python game worker. The featured companion **Mori** is the actual Anna-generated result of the original sprout doodle shown in the editor. The first listing image is the completed companion, followed by its reference drawing, album, dungeon and welcome screen. The screenshots are browser captures, not generated UI mockups.

- `01-first-meeting.png`: first meeting and random/drawing/photo selection, 1280 × 1000.
- `02-companion-and-care.png`: **Mori after drawing → Anna analysis → portrait generation**, conversation area and care controls, 1280 × 1000. This is the first image in the listing.
- `03-care-and-album.png`: daily quests, growth album and pixel preparation, 1280 × 850.
- `04-draw-your-companion.png`: the same sprout reference entered through the real drawing editor's pointer controls, 1280 × 1000.
- `05-pixel-dungeon.png`: actual discovered-dungeon preview and the current companion's pixel silhouette, 1280 × 900. Entry is not pressed.

`demo/reference.png` was drawn with `scripts/store_drawing.mjs`. The unmodified app functions `checkArtwork` and `birthPrompt` supplied the normal analysis and generation requests to Anna. Anna returned **plant / nature**, the portrait in `demo/portrait.png`, and a personality using the unchanged `personalityPrompt`/`parsePersonality` flow. Preparation used **three Anna AI calls**: one analysis, one image generation, one personality initialization. `demo/provenance.json` records their results and image hashes, without credentials or signed URLs. The pixel portrait is the existing app's local conversion of this same generated portrait.

`scripts/store_fixture.py` creates disposable games with those analyzed birth traits, commits the real generated personality through the engine, and performs walk commands until a dungeon is discovered. Game values are not manually edited. `scripts/capture_store.mjs` serves the shipped files in a network-isolated browser with read-only host responses and the recorded art. Capture makes **no additional AI calls or production storage calls**, and no real user's data is changed. Chat is empty; no conversation is fabricated. These captures do not certify native installation or production persistence.

Reproduce from `anna/` with `node scripts/capture_store.mjs` after preparing the existing assets and dependencies. This reuses the recorded Anna outputs, checks the source and result hashes, and refuses a starter-image fallback. The randomly discovered dungeon may differ on a recapture. All five images were visually checked before metadata synchronization. `app.json` references the local files in display order; Anna CLI uploads them through the official listing screenshot API.

The first 0.8.1 screenshot set showed a random starter and an unrelated sketch; this revision replaces them with the same original drawing and its actual generated companion. Installed-runtime and persistence verification are recorded separately in [0.8.1 release notes](../RELEASE_081.md).
