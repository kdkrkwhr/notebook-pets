# README screenshot sources

The feature guides use browser captures of the actual Notebuddy UI, not generated interface mockups. No live user's companion, conversation or account details appear in these documentation images.

## Creation, care, album and dungeon

The existing images in [`anna/store/`](../../anna/store/README.md) were recaptured from the 1.0.0 UI on 2026-10-14 with disposable real-engine views and are also the 1.0.0 store listing images. The reference drawing and the Anna-generated companion are the same **Mori** throughout. Chat is empty; no dialogue was fabricated. The dungeon image is explicitly a **preview before entry**, not a battle capture.

The READMEs link to these files in place, so they always show the current store captures.

## Item book · 0.9.0

These three PNGs are unchanged copies of the screenshots captured and visually checked during the 0.9.0 item implementation on 2026-10-14:

| File | Shows |
| --- | --- |
| [items-catalog-ko.png](items-catalog-ko.png) | Actual Korean catalog dialog with all sixteen items, filters and search |
| [item-detail-ko.png](item-detail-ko.png) | Frost Crown detail, planned reward and attachment requirements |
| [items-mobile-ko.png](items-mobile-ko.png) | Actual catalog layout in a 360 × 740 browser viewport |

The shipped UI was rendered with the isolated test SDK; capture made no Anna AI or production storage calls. The desktop and detail images were captured from the real dialog elements, and the mobile image from the page. The items are explicitly a preview, not owned or equipped inventory.

The installed Anna app was checked separately: sixteen decoded images and matching code/art hashes, a working detail view and preserved user data. See [0.9.0 deployment verification](../../anna/RELEASE_090.md).

The item illustrations were generated with the built-in image generation tool; their [source files and exact prompts](../../assets/items-v1/README.md) are distinct from these UI screenshots.
