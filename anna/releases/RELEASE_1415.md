# 1.4.15 — Mobile layouts and touch support

Prepared on 2026-10-19 at the owner's request. The owner explicitly authorized a new review update after mobile adaptation and verification. This bundle includes 1.4.14's five locale options. Game tool remains **0.9.6**; no game rules or tool binaries change. Public web remains on hold.

- Declare `ui.form_factors: ["desktop", "mobile"]` and lower the resizable view's minimum width to **320px**. Use one shared entry for Anna desktop and mobile. Let the Anna shell inject viewport metadata; no separate native app binary is created.
- Add safe-area padding using `env(safe-area-inset-*)` and `--anna-safe-area-*`. Constrain dialogs to the available screen, including landscape home and dungeon views.
- Increase mobile buttons, selects, help triggers and summary targets to at least **44×44 CSS px**. Keep two-column growth albums on narrow screens, readable form text and wrapping creation controls.
- Keep evolution close/confirm controls and collection headers accessible while scrolling. Tappable explanations open and close without toggling care settings or making AI calls; touch entry does not trigger mouse-hover behavior.
- Compact the home footer, retain scrollable purchases and provide a side-by-side world/shop view on short landscape screens. Protect chat input and send controls in a reduced-height keyboard viewport.

Verification: isolated touch-enabled browser tests cover all five locales at 320×568, birth drawing/file mode, chat at reduced height, theme/catalog/detail, free home appearance, shop and purchase confirmation, evolution, walk choices and dungeon completion. Rotation and synthetic notch/home-indicator insets are covered. Existing browser recovery and desktop theme tests are retained. No paid Anna AI requests are needed.

Physical iOS/Android device and native keyboard behavior remain for the owner to verify. Browser emulation is not a claim of physical-device testing. Final deployed revision, immutable version ID and release-review outcome will be recorded after deployment.
