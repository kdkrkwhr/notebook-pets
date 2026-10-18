# Review submission · 1.4.11

Submitted at the owner's explicit request on 2026-10-18: **1.4.11 / immutable version 1443 / pending_review**, replacing 1.4.10 / 1442. Frozen game tool **0.9.4 / Executa version 773 / master 1193**. Working revision **81**; owner-installed **0.0.0-draft**. No public-release command was run.

## What reviewers should see

- A concise **Evolve / 진화** button below the XP bar. Leveling alone never evolves a companion. Level and cumulative activity requirements unlock one explicit evolution at a time.
- Three paths informed by care, adventures, recent direct conversations and a bounded memory of previous evolutions. One preserves the current element; two offer other elements and appearance directions. The user selects a card and confirms.
- One text/vision request observes the current portrait and prepares suggestions. Optional artwork uses one text-to-image request for the selected path, without an image-edit API. An image failure keeps the evolution and previous portrait; received output supports save-only recovery. Home pixel generation remains a separate first-visit choice with a free default.
- English evolution screenshot supplied by the owner, in listing position 2. The six positions are companion/care, evolution, empty home garden, garden shop, drawing editor and dungeon preview. It replaces the item-book slot; that asset remains in documentation. Korean and English READMEs explain prerequisites, choices, appearance/element changes and AI usage.

The English screenshot displays built-in English route descriptions. The Korean documentation screenshot displays the owner's saved personalized prose. Both are unedited real UI captures; no extra paid generation was used to prepare the submission. See [asset provenance](../store/README.md).

## Verification

Strict manifest validation and four focused evolution browser cases passed. Windows/Linux Anna CI **39106067679** passed, including UI, browser, storage/protocol and executable smoke checks; shared CI **39106067743** passed. Installed evolution source hash matches Git **e0844c2** and the visible button reads Evolve; cloud tool 0.9.4 is loaded/running. The listing fields match the committed description and all six CDN screenshots decode, including the 1100 × 784 English evolution image.

Shared changes and guides were merged through Git into `release-web`, source **ee6a4b5**, web **0.7.0**. Pages **39106404258** and shared CI **39106404298** passed. Public-site evolution verification passed in a disposable browser with mocked AI: two stages, one vision and one text-only image/job per stage, no home-image calls, preserved chat and valid backup. Existing Orca web save hash remained unchanged. Real paid-provider image quality was not retested; the physical Windows runner remains unverified.

Frozen bundle **1340**, **171 files / 171330654 bytes**, manifest SHA-256 **38edb72fa2d36dc79b2a2555b70ed450f46841260f5e3324ad2fa91e7ef26560**. A fresh platform read confirmed candidate **1.4.11 / pending_review** and matching listing content. Approval and public release are still pending. Future review changes require a fresh explicit request.
