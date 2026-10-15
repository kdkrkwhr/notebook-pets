# 1.1.1 · Expansion artwork and deployment completion

App **1.1.1**, unchanged game tool **0.7.0**. Prepared on **2026-10-15 KST**. Owner deployment and immutable version creation are pending verification; the review candidate remains **1.0.0**.

## Changes

- Sunken Palace and Forgotten Clockwork City now have bundled discovery illustrations and illustrated three-pose bosses. Square atlas cells retain their proportions. The old procedural expansion bosses are removed; ordinary enemies and room/corridor movement stay unchanged. There are no new gameplay, storage or runtime AI operations.
- README and Anna user guides in Korean and English describe all five playable regions, retain the distinction between the sixteen-item preview and future equipment, and include separate screenshots of the new discovery cards.
- Root `VERSION`, app metadata and npm versions agree on 1.1.1. The shared 1.0.0 review listing and store screenshots stay unchanged.

## Validation and deployment

- Local JavaScript **81**, browser **90** and strict manifest validation passed. Expansion tests cover both previews, transparent atlas gutters, distinct boss poses and no gameplay/AI requests.
- Korean discovery cards, desktop/mobile previews and boss battle frames were captured from the shipped UI with disposable engine views and the recorded Mori portrait. No page errors or mobile overflow. README validation checked nine Markdown files, 153 local links/anchors and eleven unique images.
- The previously tested Windows/Linux tool 0.7.0 packages are unchanged; their hashes match the 1.1.0 deployment record. Final CI, version IDs, working revision, both running agents and data-preservation checks will be recorded after deployment.
