# 0.9.0 · Item catalog preview

App **0.9.0**, unchanged game tool **0.6.0**. Adds sixteen illustrated cosmetics and a read-only item book. Owner test deployment was verified on **2026-10-14 KST**. The shared listing and pending **0.8.1** review remain the review materials.

## Behavior

- Common, Hellgate, Ice Kingdom and Dream Forest collections each have head, neck, back and surrounding-effect items. Blazing Cape, Frost Crown and Firefly Companions are the three rare designs.
- The home entry opens a responsive catalog with English/Korean text, region/type filters, text search, empty-state recovery and item details. Native dialogs support keyboard close and focus restoration.
- Names, lore, planned acquisition and attachment requirements are shown. The UI explicitly marks this as a preview; purchase prices and repeated-clear counts are not yet set. No ownership, purchase, gift, equipment, body-analysis or reward operation is added.
- Collection will be independent of wearing. Glove compatibility would require hands in the final portrait; missing parts must never be invented. Obscured parts need confirmation. These are future fitting rules, not a claim that this release analyzes the character. See [ITEMS.md](../docs/ITEMS.md).
- Sixteen original transparent PNG illustrations were generated with the built-in `image_gen` tool, copied unchanged and bundled locally. [Artwork and exact prompts](../../assets/items-v1/README.md). Browsing invokes no AI and writes no save data.

## Verification

- JavaScript **78**, browser **87** and strict manifest validation passed locally. Catalog checks cover pre-creation access, combined region/type/search filters, empty-state reset, detail art decoding, keyboard close/focus restoration, Korean 360px layout and no game/storage/AI calls while browsing.
- All sixteen source PNGs have real transparency and match their bundled copies. The actual shipped UI was captured in isolated desktop, mobile and detail views and visually inspected; all sixteen illustrations decoded without browser errors.
- Source **36b47665739c244c21752af7117de230ffce0da7** passed both Windows/Linux jobs of [Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38515263488), including storage/protocol tests and standalone package smoke tests, and the [engine workflow](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38515263453). The unchanged tool was not republished.

## Owner deployment

- Working revision **45**, **137** ready bundle files; immutable app **0.9.0 / version ID 1379 / bundle ID 1278**. Installed to the owner as **0.0.0-draft** using the official working-install endpoint.
- Actual agent **agent_51a98c681c364ed788a854773058d51b** reports tool **0.6.0 / Executa version 746**, loaded and running. Installation retained the already loaded tool.
- The actual installed UI reports **Connected**, with no visible connection notice. Opened its item book and Frost Crown detail, verified **16 of 16** items, all sixteen image decodes, planned-reward text and attachment requirements, and visually inspected the installed detail screen. Four code/style files and all sixteen PNGs returned HTTP 200 and SHA-256 values identical to the tested local files.
- The account was already at the new-companion welcome screen. Verification did not create a companion, spend a walk charge or call AI. Game/start marker, art, chat, walk story and personality-draft values and ETags matched immediately before installation and after the UI checks.
- Review **0.8.1 pending_review** and all eight shared listing fields were preserved and independently checked. This is an owner test update, with no new review submission or public publication.
- Remaining work is collection/ownership, acquisition rules and pricing, per-portrait anatomy analysis, fitting and equipment. The catalog grants no items and performs no body analysis. Its icons are static, not equipped portraits or animated effects.
