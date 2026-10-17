# 1.4.9 - garden, current listing and review

# 1.4.9 garden expansion, listing and review - 2026-10-18

User explicitly requested all current changes, descriptions and screenshots in review. **Review 1.4.9 / ID 1439 / pending_review**, frozen **tool 0.9.2 / Executa 768 / tool ID 1193**. Source **16c63fa**, working revision **77**, installed owner draft **0.0.0-draft**. No public release.

- Added 36 garden objects in six groups; 48 total objects (12 indoor including the free nest). Area/style filters, unique local pixel art, collision/path checks and garden undo. Newest purchases get candidate priority. At most three placements per explicit Decorate request; indoor carrying remains animated, outdoor placements appear immediately. Buying/browsing/movement never call AI.
- Includes manual portrait redraw and obsolete album UI removal, walk-result-first dungeon discovery reveal, optional care AI, hover explanations and the previously verified personal home appearance flow. No new paid AI calls.
- Rewrote tagline/description and replaced all six listing screenshots. Nine current UI captures retained; listing uses care, garden, garden shop, drawing, dungeon preview and 24-design item book. Isolated Mori demo with declared 200 demo coins, no live account data or AI calls. All six uploaded WebP images decode and live description/tagline exactly match source.
- Actual installed app: Connected; All 48 / Inside 12 / Garden 36, all 36 garden images decoded, removed controls absent. Five UI files match local SHA-256. Cloud runner **0.9.2 loaded/running**. Raw game value/ETag and four app KV values unchanged. Existing balance and owned objects preserved; the earlier requested owner coin adjustment did not overwrite subsequent purchases.
- Core **225 tests (one optional skip)**, JS **92**, storage/protocol **70**, full browser **117**, strict passed. Final shader/hover changes passed the focused real-core garden browser and nine capture flows. Windows/Linux packages are from successful CI **39050064605** at core source **2b4002b**; core CI **39050064609** passed. Latest metadata/UI CI **39051835351** passed; Anna run **39051835480** still running at record time. Compiled rules did not change in the later UI/listing commits.
- Deployment detail: CLI 0.1.57 `apps push` registers tool metadata without uploading binaries. Explicit `executa publish --profile binary` uploaded both tested packages and froze 768. A stale successful app install job reused the old runner; the scoped `/agents/{cloud}/plugins/reinstall` endpoint with the owner's user_executa_id replaced only NoteBuddy. Agent manifest caching omitted storage; restored the exact source protocol manifest_cache before installing the app. Review now freezes 768. PC returns no agent_version/loaded/running facts (offline); Windows package is uploaded and CI smoke-tested, PC execution is unverified. Original cloud default restored.
- Bundle **1336**, 170 files, SHA-256 manifest **58b068d0a228dfc9da2ef7826fcd105205f4e36737dc035418c35b48abc1c66e**.
- Linux package SHA-256 **52cb79ae96ba5e45f6d899994531e92b55f6ee23b8c55c07a9b3844b712ea019**; Windows **ebb1dd3b86926196f28f28615fb2b640b01e602c66091399642bf5a294384af2**.


---

## Earlier steps in this bundle

# 1.4.9 test update

- Removed manual portrait redraw controls, confirmation dialog, generation and retry handlers. Initial drawing/photo birth, saved artwork and the explicit first-home appearance choice remain.
- Owner balance set from 0 to a total of 100 coins using a private backup and conditional write. Full saved-state readback matched; running game tool confirmed 100 coins. No shared reward rules changed.
- Review remains 1.4.8 / ID 1437 / pending_review.

Validation: JS 92, full browser 116, strict passed. Source 60a5257 pushed to release; Anna working revision 74 installed and checked. Controls absent, saved portrait visible, four app KV values unchanged. Installed app.js SHA-256 ca84e281181b8ea8816a9d65a1ea47d4b57d67f1044c5ad95a2d62f9ef94acb7 matches local. Review remains 1.4.8. Owner subsequently spent coins/changed home during this task; later progress preserved.
