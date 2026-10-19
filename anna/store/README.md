# Store screenshots - 1.4.12

`11-image-progress-en.png` captures the actual current English UI while a controlled image response is held. It shows the birth stage, activity mark, elapsed clock and neutral continued-wait guidance. The capture uses the isolated browser-test SDK and fake clock, not a fresh Anna provider request or owner data. It demonstrates UI behavior, not measured provider latency or a successful new generation. No image editing was applied.

Reproduce from `anna/`: `node --test --test-name-pattern="birth image generation" tests/browser/activity.browser.mjs` (Chromium or the installed Edge channel), then copy `.local/activity-ux/birth-waiting.png` from the repository root. The 1.4.12 capture was produced after updating package metadata; runtime UI source is unchanged from the tested 60569b1 implementation.

Current listing order: companion/care, **owner-supplied English evolution**, empty home garden, garden shop, **English image-generation progress**, dungeon preview. The progress capture replaces the drawing-editor slot within the six-image limit. The drawing editor remains in the README and repository. The other five captures remain accurate for their idle screens; their provenance follows below.

# Retained 1.4.11 evolution captures

The owner supplied two unedited screenshots of actual evolution testing and explicitly requested their use in documentation and review. `10-evolution-en.png` is the review image; `10-evolution-ko.png` illustrates the Korean README. These show fulfilled prerequisites, three selectable paths, element preservation/change and the optional single portrait request. The English capture shows the built-in English route descriptions; it is not a translated AI response. Names, wording and appearance directions vary by companion. No extra AI call or game mutation was made to prepare these assets.

Listing order (Anna allows six): companion/care, **English evolution**, empty home garden, garden shop, drawing editor, dungeon preview. The evolution image replaces the item-book slot; the item-book capture remains in the repository and documentation.

## Retained 1.4.10 captures

Captured from the current shipped UI using disposable real-Python-engine views and the existing Anna-generated Mori reference/portrait. No live user data, new paid AI, or production storage calls. No conversation is fabricated.

Previous listing order:
1. 02-companion-and-care.png: companion, chat, care and the optional care-AI checkbox.
2. 07-home-garden.png: empty starting yard with cottage, lawn, paths and fence; no separate default trees or decorations.
3. 08-garden-shop.png: new split-pane shop beside a decorated demo garden, Shop/My collection tabs, All 48 / Inside 12 / Garden 36 filters and garden styles.
4. 04-draw-your-companion.png: actual drawing editor and the recorded reference.
5. 05-pixel-dungeon.png: current dungeon preview before entry, using the same companion.
6. 06-item-book.png: current 24-design item book, not owned/equipped inventory.

The title, welcome, simplified growth album and new My collection view (09-home-collection.png) are also recaptured but are not in the six listing slots. All six listing captures were visually inspected.

Reproduce: `node scripts/capture_store.mjs` from anna/. The capture browser blocks outside requests and every AI or persistence mutation. The garden fixture starts with 200 disposable demo coins, buys twelve garden objects through the real rules and applies validated candidates without calling an LLM. This does not represent production ownership or an AI-generated decision. Its reason is sample scene copy. The home uses the free local pixel conversion of the recorded portrait, not invented directional poses. Production garden placement, purchases and AI-call bounds are tested separately.

The original reference, portrait and personality remain in demo/ with provenance.json and checksums. Their historical preparation used three Anna calls; this recapture uses zero. capture.json records the current version, counts, fixture currency and source. These screenshots do not replace installed-runtime or persistence verification, which is recorded in the release notes.
