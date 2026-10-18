# Store screenshots - 1.4.10

Captured from the current shipped UI using disposable real-Python-engine views and the existing Anna-generated Mori reference/portrait. No live user data, new paid AI, or production storage calls. No conversation is fabricated.

Listing order (Anna allows six):
1. 02-companion-and-care.png: companion, chat, care and the optional care-AI checkbox.
2. 07-home-garden.png: empty starting yard with cottage, lawn, paths and fence; no separate default trees or decorations.
3. 08-garden-shop.png: new split-pane shop beside a decorated demo garden, Shop/My collection tabs, All 48 / Inside 12 / Garden 36 filters and garden styles.
4. 04-draw-your-companion.png: actual drawing editor and the recorded reference.
5. 05-pixel-dungeon.png: current dungeon preview before entry, using the same companion.
6. 06-item-book.png: current 24-design item book, not owned/equipped inventory.

The title, welcome, simplified growth album and new My collection view (09-home-collection.png) are also recaptured but are not in the six listing slots. All six listing captures were visually inspected.

Reproduce: `node scripts/capture_store.mjs` from anna/. The capture browser blocks outside requests and every AI or persistence mutation. The garden fixture starts with 200 disposable demo coins, buys twelve garden objects through the real rules and applies validated candidates without calling an LLM. This does not represent production ownership or an AI-generated decision. Its reason is sample scene copy. The home uses the free local pixel conversion of the recorded portrait, not invented directional poses. Production garden placement, purchases and AI-call bounds are tested separately.

The original reference, portrait and personality remain in demo/ with provenance.json and checksums. Their historical preparation used three Anna calls; this recapture uses zero. capture.json records the current version, counts, fixture currency and source. These screenshots do not replace installed-runtime or persistence verification, which is recorded in the release notes.
