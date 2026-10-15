# Notebuddy 0.8.1 — review guide

Submitted candidate: **app 0.8.1**, immutable version **1370**, bundle **1271**, game tool **0.6.0 / version 746**. On **2026-10-14 KST**, the official CLI resubmitted review and a fresh server read confirmed **pending_review**, replacing the earlier **0.3.4** candidate. The current listing, privacy link and five screenshots were synchronized and verified. Approval and publication are pending.

This guide is repository documentation. Anna's submission command has no separate reviewer-notes field; the updated app introduction and screenshots are the materials synchronized to the listing.

## What the app does

Notebuddy is a personal virtual companion inside Anna. Choose a ready-made surprise companion, draw a reference, or upload a photo. Care, conversation and small adventures build a continuing relationship. The app supports English and Korean and keeps each user's companion, artwork and recent conversation in that user's Anna storage.

## Changes since the previous review candidate

- Drawing and PNG/JPEG/WebP upload share one analysis → visual-description → illustrated-character flow. People, animals and objects can be references. An uncertain species interpretation requires confirmation. This creates an interpretation from visual features; it does not use direct `image.edit` or claim exact copying.
- A saved fictional personality is inspired by the chosen name and appearance. Its voice and current traits are used in chat, care reactions and walk narration. Recorded game actions gradually influence curiosity, sociability, energy and caution. Chat text itself does not update trait scores. Evolution preserves the same personality.
- Walks open a focused dialog and can offer XP to collect or decline, an encounter, or a continuing story. Six three-chapter story arcs use recorded care and earlier choices. The interface explains the actual experiences affecting a story or outcome. Choices can award bond and coins according to game rules; AI only supplies narration.
- Walks can discover Hellgate, Ice Kingdom or Dream Forest. Only one discovery remains active until clear or expiry, with a 24-hour countdown from discovery. Dungeons have 3–6 rooms, automatic movement, a following camera, distinct enemies, route choices and sanctuaries. Each stage entry costs one walk charge; charges recover every five minutes up to five. Closing a paid pending choice preserves it. Cosmetic coins are recorded; the shop and wearable customization are not implemented.
- Version 0.8.1 fixes dungeon identity: the actual current companion's pixel portrait is drawn, rather than a common species rig with sampled colors. Conversion and animation are local and require no AI. A single portrait is mirrored/bobbed for movement, without generated rear/side views. Late or failed image loads cannot reuse a previous companion.

## Suggested review path

1. Open the installed app and wait for **Connected**. Choose a name and **Surprise me**, or select the drawing/photo creation option. A random start uses a bundled portrait; personality creation still uses Anna AI. Uploads accept PNG/JPEG/WebP up to 12 MiB and 16 megapixels, with each side at least 32 pixels. Selecting or previewing a file does not call AI.
2. Inspect the companion, personality details, care controls and growth album. Try care and chat. Care is committed before its optional AI reaction; failure to generate a reply does not reverse the action. Existing companions can explicitly choose **Meet your personality**.
3. Choose **Walk**, then make any offered choice. Close and reopen a pending walk through **Continue walk**. Login does not automatically open a pending story. Outcomes and rewards come from the game tool, not AI prose.
4. Dungeon discovery is probabilistic (25% per eligible walk), so a first walk does not guarantee one. When discovered, open the card to preview without spending a charge, then explicitly enter a stage. Try a route choice, pause, 3x playback and close/reopen. Subsequent stage entry requires another charge.
5. Switch to Korean and inspect the privacy notice. Use reset/removal only with disposable test data: they require explicit confirmation. Refresh/reopen should preserve ordinary progress and should not automatically retry paid image/personality generation.

## AI, storage and limits

Chat, care reactions, walk narration, image analysis, image generation and personality initialization use the user's Anna AI allowance. Photo/drawing analysis and portrait generation are separate requests. Failed requests may still use allowance. A received but unsaved result can be retried without regeneration while retained in the same window. No external API key is required by this app.

The game tool has sequenced, idempotent actions and authoritative rewards. Per-user storage contains game progress, bounded interaction memories/personality, up to 24 recent chat messages, reference images/descriptions, portraits and the current walk story. The privacy notice explains reset/removal and platform/provider retention separately. No user's chat is deliberately placed into another user's context.

Live image-to-image accessory editing, a cosmetic shop and manual dungeon movement are outside this release. AI wording and visual similarity vary. The feature screenshots use isolated demonstration data, not real account records. The sprout doodle and completed companion are a matching reference/result pair from the app's actual Anna analysis and generation prompts; the same portrait appears in the album and dungeon. See [screenshot provenance](../store/README.md).

## Validation

Source `f964127` passed **76 JavaScript tests, 85 browser tests and strict validation** locally, and [Windows/Linux Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38495497327), including storage/protocol tests and standalone package smoke tests. Owner installation was verified with the running **0.6.0** tool, Connected UI, and exact hashes for the changed dungeon modules. See [release/deployment evidence](../releases/RELEASE_081.md) and [privacy notice](../PRIVACY.md).
