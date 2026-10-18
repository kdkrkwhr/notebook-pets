# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 기록](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-18)

| 항목 | 값 |
| --- | --- |
| Anna 테스트 앱 | **1.4.10 / working revision 78 / 소유자 초안 0.0.0-draft** |
| 심사 | **1.4.9 / ID 1439 / pending_review**, 명시 요청 전 변경 금지 |
| 게임 도구 | **0.9.3 / Executa 772**, 변경 없음 |
| 검증 | JS 92 · 전체 브라우저 117 · 14개 언어/폭 조합 · 5개 창 · strict |
| 공개 웹 | 기존 배포 유지, 이번 배포 제외 |
| Limits | Garden placement is immediate; PC offline, Windows host execution not verified |

최신 작업 2건만 유지하며 이전 기록은 내용 변경 없이 이력 맨 위로 옮긴다.

---

# 1.4.10 empty starting yard - 2026-10-18

Source **7037da7**, owner test app **1.4.10 / working revision 78 / installed 0.0.0-draft**, actual cloud tool **0.9.3 / Executa 772 / ID 1193 loaded/running**. The user clarified that all default trees and decorations should be absent. Kept the cottage/fence/paths/lawn and existing owned objects; removed all separate default trees, bushes, bench, pots and flower clusters. Cottage artwork is preserved. The earlier sparse two-tree variant was never deployed.

- Home/geometry tests **11**, JS **92**, real-core home browser **5**, strict passed locally. Core CI **39084579106** and both Windows/Linux jobs in **39084579116** passed, including full browser/protocol checks and packaged executable smoke tests.
- Explicitly published both tested 0.9.3 binary artifacts, then used scoped cloud tool reinstall and restored the source storage declaration. Installed the working UI. Actual world default object list is exactly **house**; existing purchased objects still render. Current home-scene.mjs SHA-256 **770b5ff307ae4604485cb450d9fb615cfeea2a3153a2ef3087f5a5e031cb5fcd** matches the installed file. Connected, no error notice.
- Private pre/post game value and ETag are identical. Art/chat/walk-story/personality KV all identical. No game migration, paid AI or production purchase calls.
- Review **1.4.9 / ID 1439 / pending_review**, tagline/description, all six screenshot URLs and shared listing fields verified unchanged. No app cut, review submission or public web deployment. PC host remains unverified/offline as previously recorded; Windows package is CI-tested and uploaded.

---

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
