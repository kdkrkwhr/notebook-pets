# 1.1.1 · Expansion artwork and deployment completion

App **1.1.1 / ID 1393 / working revision 50**, unchanged game tool **0.7.0 / Executa version 752**. Owner test deployment and immutable version creation were verified on **2026-10-15 KST**. The installed owner app uses `0.0.0-draft`, identical to the new cut (`dirty_vs_latest_cut=false`). The review candidate remains **1.0.0 / ID 1383 / pending_review**.

## Changes

- Sunken Palace and Forgotten Clockwork City now have bundled discovery illustrations and illustrated three-pose bosses. Square atlas cells retain their proportions. The old procedural expansion bosses are removed; ordinary enemies and room/corridor movement stay unchanged. There are no new gameplay, storage or runtime AI operations.
- README and Anna user guides in Korean and English describe all five playable regions, retain the distinction between the sixteen-item preview and future equipment, and include separate screenshots of the new discovery cards.
- Root `VERSION`, app metadata and npm versions agree on 1.1.1. The shared 1.0.0 review listing and store screenshots stay unchanged.

## Validation and deployment

- Local JavaScript **81**, browser **90** and strict manifest validation passed. Expansion tests cover both previews, transparent atlas gutters, distinct boss poses and no gameplay/AI requests.
- Korean discovery cards, desktop/mobile previews and boss battle frames were captured from the shipped UI with disposable engine views and the recorded Mori portrait. No page errors or mobile overflow. README validation checked nine Markdown files, 153 local links/anchors and eleven unique images.
- The previously tested Windows/Linux tool 0.7.0 packages are unchanged; their hashes match the 1.1.0 deployment record and both cached packages were retained by the immutable cut. Both PC and cloud agents now report **agent_version=0.7.0, loaded=true, running=true**. The temporary local-agent selection was restored to the original cloud default.
- The installed Anna frame was reloaded and visually checked: **Connected**, no error notice, existing portrait and pixel image loaded. All seven checked script/image files from the actual installed path returned **HTTP 200** and matched local SHA-256 hashes. The protected entry page was verified through the running frame; fetching its bare URL without runtime parameters returns 403.
- Source revision **`0b0d3496b35e6b1b296f9db097ba18de6f95ed70`** passed [engine CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38701415414) and [Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38701415506) on Windows and Linux, including browser recovery, storage/protocol tests, package builds and standalone smoke tests.
- The five game/art/chat/walk-story/personality-draft storage values **and ETags** are unchanged. Shared listing fields, six screenshots and review state exactly match the pre-deployment snapshot. No gameplay actions, walk consumption, production AI calls, public release or review resubmission were performed.

## Remaining limits

- The existing platform limitation around simultaneous first creation remains documented in [FIRST_CREATION.md](../FIRST_CREATION.md).
- The sixteen-item book is still a preview; item collection and equipment remain future work. The new illustrations are discovery-card artwork; exploration continues to use the existing room/corridor renderer.
- The 1.1.0 handoff's unfinished immutable-cut, local-tool and installed-UI checks are completed by this superseding 1.1.1 deployment.
