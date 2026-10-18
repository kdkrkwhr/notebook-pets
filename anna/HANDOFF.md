# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 기록](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-18)

| 항목 | 값 |
| --- | --- |
| Anna 테스트 앱 | **1.4.13 / working revision 88 / 소유자 초안 0.0.0-draft** |
| 심사 | **1.4.13 / ID 1446 / pending_review**, 명시 요청 전 변경 금지 |
| 게임 도구 | **0.9.5 / Executa 774**, 실제 클라우드 loaded/running |
| 검증 | Python 230 · JS 92 · 브라우저 130 · 저장/프로토콜 73 · 격리 APS 시나리오 14 |
| 공개 웹 | **0.7.0 / ee6a4b5**, Pages CI **39106404258** 성공 |
| Limits | Owner scope: one device per account; fresh AI quality / physical PC runner not tested |

최신 작업 2건만 유지하며 이전 기록은 내용 변경 없이 이력 맨 위로 옮긴다.

---

# Anna 1.4.13 review refresh — 2026-10-18

Fresh owner instruction authorizes this replacement. Candidate **1.4.13 / immutable ID 1446 / pending_review** replaces **1.4.12 / 1445**. Owner test app **1.4.13 / working revision 88 / installed 0.0.0-draft**. Tool remains **0.9.5 / frozen Executa 774 / master 1193 loaded/running**. No public release or web deployment.

- Includes the tested **76449c3** home image-link fix: renew the saved appearance URL on entry and use actual decoded renderer state for missing-image guidance. No runtime-code changes during review packaging **246781d**; app/package version metadata changes only. Changelog explains the long-session failure, recovery, retained images and zero AI regeneration.
- Runtime CI **39116562365** passed Windows and Linux (**130 browser / 92 JS / 73 storage-protocol**, strict validation, standalone build/smoke); shared CI **39116562380** passed. Release packaging passed strict validation and JS **92** again. Existing personal directional sheet displays in the actual installed home; all three changed runtime source hashes match. Additional paid AI calls: **0**.
- Cut froze bundle **1343 / 172 files / 171337956 bytes**, manifest SHA-256 **1419a6f232f68be462dc7aa0b782f9c7ab2c0cbae375c751f9f3d6988b4a1ddf**. Working content hash **6858a171240677535ee2e6a0c21ada8fe46a667af6c8390034f46522ecc36098**. Fresh platform read confirms candidate **1446**, revision **88**, **dirty_vs_latest_cut false**, correct minimum/exact tool 0.9.5 dependency, Connected UI and no notice.
- Existing shared listing is unchanged and all six screenshots decode. Owner game ETag and art/chat/story/personality values/ETags remain unchanged. Approval, publication, fresh provider-quality testing and physical-PC execution are not claimed. Future review replacement requires another explicit request. See **releases/RELEASE_1413.md** and **reviews/REVIEW_1413.md**.

---

# Anna home image-link recovery — 2026-10-18

UI-only source **76449c3**, app **1.4.13 / working revision 88 / installed 0.0.0-draft**, actual cloud tool **0.9.5 / Executa 774 / master 1193 loaded/running**. Review **1.4.12 / ID 1445** and shared listing must remain unchanged; web excluded.

- Reproduced owner home with `data-sprite=missing`, failed fetch and hidden missing-image guidance. The same saved 1024x1024 / 1682284-byte personal sheet downloaded through a fresh signed link and decoded into all 16 frames. No generation or owner data mutation.
- Renew the current saved home appearance download URL on each home entry, with a companion/stage/path guard. Decoded renderer state controls missing-image guidance, replacing the incorrect assumption that a URL means a visible character. No AI, automatic generation, storage write or fallback appearance replacement.
- Regression test fails before the fix (`missing` instead of `ready`), then passes: expired link on entry, fresh link recovery, real fetch failure with visible guidance, subsequent reopen recovery and zero AI requests. Local home/renderer browser **11**, JS **92** and strict validation passed. Installed source hashes for all three changed modules match. Actual home reports **directional / ready**, with the existing hydra visible at the doorstep; observed **847** sprite draws, **383** positions and **9** frames. Owner game ETag and artwork/chat/story/personality values/ETags are unchanged, as are the complete frozen review row and shared listing. Additional paid AI calls: **0**. Full local browser verification **130/130** passed (352 seconds).

- Working bundle **172 files / 171337956 bytes**, content hash **ed08fca4c863f5666ebc971529e3f842178ab678d9b39885bf1db96ac589f6dc**. Private proof captures: `.local/home-url-canvas.png`, `.local/home-url-installed.png`. Reopen the whole installed app to load the new UI; no portrait regeneration is needed. Review replacement still requires a fresh explicit request. CI **39116562365** passed on **Windows and Linux**: **130 browser / 92 JS / 73 storage-protocol**, strict validation and standalone executable build/smoke. Shared CI **39116562380** also passed all three jobs.

---
