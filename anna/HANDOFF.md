# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 기록](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-23)

| 항목 | 값 |
| --- | --- |
| Anna 공개 앱 | **1.4.13**, [스토어](https://anna.partners/store/@kdkrkwhr/notebuddy) |
| Anna 테스트 앱 | **1.4.16 / working revision 92 / 소유자 초안 0.0.0-draft** |
| 심사 | **1.4.16 / ID 1587 / pending**, 이전 1.4.15는 superseded |
| 모바일 | **desktop/mobile 선언 / 최소 너비 320px / 기존 5개 언어 유지** |
| 게임 도구 | **0.9.7 / Executa 818**, 실제 클라우드 loaded/running, 설치 success |
| 검증 | CI Windows/Linux 각각 **브라우저 135 · JS 96 · 저장/프로토콜 76**, 서버 권한 검증 통과 |
| 공개 웹 | **0.7.0 / ee6a4b5**, 이번 작업에서 변경·배포하지 않음 |
| 한계 | Anna 승인 대기. 실물 iOS/Android·네이티브 모바일 셸·OS 키보드/뒤로가기는 미검증 |

1.4.15 심사 중 보고된 저장소 권한 불일치를 수정하고, 사용자가 승인한 1.4.16으로 교체·재제출했다. 앱 전체 상태는 published이며 새 버전의 release_review_state는 pending이다. 현재 공개 1.4.13과 공유 소개/스크린샷은 유지했다. 이후 심사 갱신에는 매번 새로운 사용자 지시가 필요하다. 최신 작업 2건만 유지하며 오래된 기록은 변경 없이 이력 맨 위로 이동한다.

---

# Anna 1.4.16 storage declaration fix — 2026-10-23

Runtime source **daa3014**. The reported server error was reproduced: the tool's cached runtime manifest declared only `aps.kv`, while the app also required files and tool read/write access. Tool **0.9.7** declares all four capabilities in distribution metadata and its runtime `describe`, without a separate tool `storage` field. App permissions, UI source, gameplay, save format and AI behavior are unchanged. Full-manifest protocol and packaged-binary smoke assertions prevent an incomplete declaration from passing validation.

[Anna CI 39711760114](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39711760114) passed Windows and Linux: each **135 browser / 96 JS / 76 storage-protocol**, strict validation and standalone build/smoke. [Shared CI 39711760205](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39711760205) passed. Full local Windows checks passed the same counts plus binary smoke. Initial local generated-engine staleness was resolved by `prepare:assets` and a full passing rerun; the first Windows CI attempt timed out after slow tooling setup, and the rerun passed. Both tested platform packages are published and their CDN bytes/metadata hashes match the tested archives; exact hashes are in **releases/RELEASE_1416.md**.

Installed owner app **1.4.16 / revision 92 / 0.0.0-draft**, actual cloud tool **0.9.7 / immutable Executa 818 / master 1193 / user executable 35689 loaded/running**. Final install status is **success / Already loaded**. An initial stale executable-path error was resolved by reinstalling only this tool and reopening the draft. The cloud agent resumed on the following day's refresh and still runs 0.9.7. UI is connected with no notice; the existing portrait and two chat messages load, home sprite is ready, and installed **app.js / mobile.css / data.mjs / home-sprite.mjs / anna-tool-ids.js** hashes match the local bundle. All five owner APS documents (game, art, chat, walk story, personality draft) retain identical values and ETags. Paid AI calls: **0 text / 0 images**.

Fresh user authorization covers **1.4.16**, since immutable 1.4.15 cannot be overwritten. Cut **1.4.16 / ID 1587** freezes tool **0.9.7 / Executa 818**, bundle **1472 / 175 files / 171604935 bytes**, manifest SHA-256 **83c7c16b6be79de692bdb8608d3eb57a0af446dcaf0bfd4c3cd3669f237cba8a**. Working hash **c6ed85cf2c262e4f340f1b4610f1c1c42058c758c8b5be3c22cf4727957e6fcf**, **dirty_vs_latest_cut false**, minimum/exact tool **0.9.7**. The release request returned **pending / is_latest false / published_at null**; old **1.4.15 / 1486** is **superseded**. Developer Console confirms **1.4.16 in release review**. Public **1.4.13 / 1446**, its complete immutable row, listing and six screenshots remain unchanged; no public web deployment.

Server manifest validation passed after installation, overnight and for frozen 1.4.16 after submission, with **valid true / errors []** and all four cached capabilities retained. Approval/publication, physical mobile/native-shell behavior and new provider-quality testing are not claimed. Private evidence: **.local/storage-fix-{cut-result,submission,final,ui-final,validation-binaries,validation-latest}.json** and test/build logs; do not commit these owner-data snapshots. See **releases/RELEASE_1416.md** and **reviews/REVIEW_1416.md**.

---

# Anna 1.4.15 mobile support — 2026-10-20

Runtime source **cc36c65**. Anna CI **39273350333** passed Windows and Linux: each **135 browser / 96 JS / 76 storage-protocol** checks, strict manifest validation and standalone build/smoke. Shared CI **39273349842** passed all three jobs. Focused mobile suite **4/4** passed locally; the earlier full local run passed 134 before the fourth mobile scenario was added.

Installed owner app **1.4.15 / working revision 91 / 0.0.0-draft**. Actual cloud tool stays **0.9.6 / immutable Executa 786 / master 1193 / user executable 35689 loaded/running**; no tool-source or binary replacement was needed. Actual installed bundle, official SDK and official host bridge passed five-locale reads at 320px, tappable care help and landscape home checks. Changed installed **mobile.css / hints.mjs / app.js** SHA-256 hashes match local source. Owner game ETag and artwork/chat/story/personality values and ETags are unchanged. Paid AI calls for this task: **0 text / 0 images**.

Immutable review **1.4.15 / ID 1486**, bundle **1382 / 175 files / 171605357 bytes**. Manifest SHA-256 **cf07354d7aff7af92f3fdee68f6c769f1c072252b6b39cdba02bd624f87c95b1**; working content hash **b9f555e67b0d56f659ae5840a953015350254557555ec91349546fa5fb3bda41**; `dirty_vs_latest_cut: false`. Frozen manifest contains `form_factors: ["desktop", "mobile"]`, minimum width **320** and exact/minimum tool **0.9.6**. The owner explicitly requested this review update after mobile verification. `apps release 1.4.15` queued **release_review_state: pending**, current candidate **1.4.15**, `is_latest: false`, `published_at: null`. Public **1.4.13**, its immutable row and shared listing/screenshots remain unchanged; public web was not deployed.

Limits: touch emulation and a reduced-height viewport do not establish physical iOS/Android or native keyboard/hardware-back behavior. The dedicated Anna mobile-shell endpoint returned 401 with available credentials after the browser session expired; native-shell verification is not claimed. Owner installed UI and real cloud RPC were verified independently through the existing authorized CLI identity and official bridge, with a read-only RPC guard. The owner plans to check mobile-client availability and physical-device behavior. Private evidence: `.local/mobile-live-proof.json`, `.local/mobile-preservation-proof.json`, `.local/mobile-final-proof.json`, `.local/mobile-support/` and CI logs. No new translation-provider or image-provider quality test was performed.

See **releases/RELEASE_1415.md** and **reviews/REVIEW_1415.md**.
