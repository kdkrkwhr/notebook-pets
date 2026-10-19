# 1.4.15 — Mobile layouts and touch support

Prepared on 2026-10-19 at the owner's request. The owner explicitly authorized a new review update after mobile adaptation and verification. This bundle includes 1.4.14's five locale options. Game tool remains **0.9.6**; no game rules or tool binaries change. Public web remains on hold.

- Declare `ui.form_factors: ["desktop", "mobile"]` and lower the resizable view's minimum width to **320px**. Use one shared entry for Anna desktop and mobile. Let the Anna shell inject viewport metadata; no separate native app binary is created.
- Add safe-area padding using `env(safe-area-inset-*)` and `--anna-safe-area-*`. Constrain dialogs to the available screen, including landscape home and dungeon views.
- Increase mobile buttons, selects, help triggers and summary targets to at least **44×44 CSS px**. Keep two-column growth albums on narrow screens, readable form text and wrapping creation controls.
- Keep evolution close/confirm controls and collection headers accessible while scrolling. Tappable explanations open and close without toggling care settings or making AI calls; touch entry does not trigger mouse-hover behavior.
- Compact the home footer, retain scrollable purchases and provide a side-by-side world/shop view on short landscape screens. Protect chat input and send controls in a reduced-height keyboard viewport.

Verification: isolated touch-enabled browser tests cover all five locales at 320×568, birth drawing/file mode, chat at reduced height, theme/catalog/detail, free home appearance, shop and purchase confirmation, evolution, walk choices and dungeon completion. Rotation and synthetic notch/home-indicator insets are covered. Existing browser recovery and desktop theme tests are retained. No paid Anna AI requests are needed.

Physical iOS/Android device and native keyboard behavior remain for the owner to verify. Browser emulation is not a claim of physical-device testing. Verified deployment and release-review evidence follows below.

## Verified deployment and review — 2026-10-20

Runtime source **cc36c65**. Anna CI **39273350333** passed Windows and Linux: each **135 browser / 96 JS / 76 storage-protocol** checks, strict manifest validation and standalone build/smoke. Shared CI **39273349842** passed all three jobs. Focused mobile suite **4/4** passed locally; the earlier full local run passed 134 before the fourth mobile scenario was added.

Installed owner app **1.4.15 / working revision 91 / 0.0.0-draft**. Actual cloud tool stays **0.9.6 / immutable Executa 786 / master 1193 / user executable 35689 loaded/running**; no tool-source or binary replacement was needed. Actual installed bundle, official SDK and official host bridge passed five-locale reads at 320px, tappable care help and landscape home checks. Changed installed **mobile.css / hints.mjs / app.js** SHA-256 hashes match local source. Owner game ETag and artwork/chat/story/personality values and ETags are unchanged. Paid AI calls for this task: **0 text / 0 images**.

Immutable review **1.4.15 / ID 1486**, bundle **1382 / 175 files / 171605357 bytes**. Manifest SHA-256 **cf07354d7aff7af92f3fdee68f6c769f1c072252b6b39cdba02bd624f87c95b1**; working content hash **b9f555e67b0d56f659ae5840a953015350254557555ec91349546fa5fb3bda41**; `dirty_vs_latest_cut: false`. Frozen manifest contains `form_factors: ["desktop", "mobile"]`, minimum width **320** and exact/minimum tool **0.9.6**. The owner explicitly requested this review update after mobile verification. `apps release 1.4.15` queued **release_review_state: pending**, current candidate **1.4.15**, `is_latest: false`, `published_at: null`. Public **1.4.13**, its immutable row and shared listing/screenshots remain unchanged; public web was not deployed.

Limits: touch emulation and a reduced-height viewport do not establish physical iOS/Android or native keyboard/hardware-back behavior. The dedicated Anna mobile-shell endpoint returned 401 with available credentials after the browser session expired; native-shell verification is not claimed. Owner installed UI and real cloud RPC were verified independently through the existing authorized CLI identity and official bridge, with a read-only RPC guard. The owner plans to check mobile-client availability and physical-device behavior. Private evidence: `.local/mobile-live-proof.json`, `.local/mobile-preservation-proof.json`, `.local/mobile-final-proof.json`, `.local/mobile-support/` and CI logs. No new translation-provider or image-provider quality test was performed.
