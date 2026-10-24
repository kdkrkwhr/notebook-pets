# Item fitting implementation · 2026-10-24 · not deployed

This commit implements a gated fitting flow for Anna's `release` track. The app and tool versions are unchanged. No Anna deployment, external permission grant, live image request, production-data write, public web update or review submission was performed.

## Release gate and API evidence

Both `bundle/equipment.mjs` and `executas/notebuddy/notebuddy_plugin.py` set `EQUIPMENT_ENABLED = false`. Owned item details show an explicit unavailable message and disabled fitting button. Tool calls are rejected too; changing browser preferences cannot enable the tool.

[Anna team response, October 23](https://forum.anna.partners/t/image-edit-fails-with-provider-errors-readerror-and-fal-ai-image-to-image-404/400/2) was read through the forum's topic JSON endpoint. It documents one `image_url`, `prompt`, `n: 1`, `model: 'fal-ai/nano-banana-2'`, and `{timeoutMs: 240000}`. The installed `@anna-ai/app-runtime` namespace exposes `image.edit` and documents the single-image request. The implementation uses exactly that contract, with no invented multi-reference parameters or masks. The team's GPT Image 2/mask routing fix is scheduled for October 30 in host 1.1.0-beta.201; deployed availability has not been verified.

The experimental transport edits the current portrait using the item's textual description and attachment constraints. It does **not** take the catalog illustration as a second reference, nor claim to reproduce its exact artwork. Approval of this visual approach versus the planned character+item composite, fit/anatomy inspection, and actual quality tests remain release prerequisites. A user preview is required before application; it is not an automated quality guarantee.

The app manifest still declares only `image.generate`. Adding `image.edit` would expand the app's allowed host methods; obtaining its platform grant requires a separate approved step. The tool distribution manifest only synchronizes its new command/argument schema, with unchanged capability declarations. No security settings were changed.

## Transaction and recovery

- `equipment_prepare` reserves one current item, companion, stage and source path without consuming it. The pending token prevents concurrent starts. UI duplicate clicks share one in-flight operation. A replayed/lost reservation never starts image generation.
- A returned URL/decoded blob is retained in memory for same-session download or journal-write recovery. The result is first copied into a private IndexedDB blob journal keyed by pet identity. A deterministic file path is referenced in ART via its existing ETag merge before upload, keeping it out of unused-file cleanup. The reference does not change the portrait. Signed provider URLs are not persisted.
- Recovery uses the journal blob or the stored file, never another image edit. Invalid images are rejected before upload/application. The UI shows a preview and the pending item's name; application checks the preview token again.
- `equipment_apply` verifies the stored file exists through the SDK FilesClient before committing. Its game write commits the active portrait pointer, removal of exactly one owned item, discovery history and request receipt together under the existing game ETag. Failed writes keep the previous portrait and ownership. File bytes and the ART reference already exist before this write.
- A lost application response is checked with the same saved request ID. If an unrelated game action makes an uncommitted ID expire, recovery clears that obsolete action without generating anything or consuming the item. The user can recover the preview and explicitly apply again with a new action ID against the same pending token/result. No automatic request restamping.
- Cancel only abandons an **unapplied** pending transaction. Late application is rejected; already committed items are not refunded and there is no unequip command. Saved result files remain referenced, so cancelling does not destroy a paid result.
- Existing saves are read without migration writes. `collectible_discoveries` preserves previously owned items when consuming one. The existing regional reward rule remains based on current ownership; a consumed item can be earned again under that unchanged rule. Quantity remains bounded to one, with 24 catalog entries and 20 obtainable items.
- Portrait resolution reuses the equipped portrait through later stages with no newer portrait, and a subsequently saved portrait can replace it. Birth, evolution and home generation transports are unchanged. New-pet/reset IDs fence off old transactions; confirmed removal/reset clears the local recovery journal.

## Limits that must not be mistaken for verified guarantees

There is no documented provider result lookup/idempotency contract. If the response is lost before its bytes can be journaled/uploaded (including a tab dying during the request or download), the app cannot recover an unseen result. It preserves the item and old portrait, retains the reservation, and refuses automatic paid retries. Device-local recovery is not a cross-device backup until upload succeeds; clearing browser data can remove that copy.

Anna offers separate game, ART and file stores, not a cross-store transaction. The authoritative item/portrait-pointer update is atomic in the game save; ART and files are staged first. Quiescent portrait cleanup remains required as in the existing app. Source checks detect observed changes before application, but coordinated concurrency with other windows replacing portraits and platform file immutability need live validation before enabling the feature. No stronger platform guarantee is claimed.

Live image quality, likeness, exact catalog-art matching, anatomical fit, real permission grants, installed Anna behavior and Windows packaging are not established by local mocks. CI supplies Windows build/test evidence separately. Before release: settle the image/composite approach and unresolved-response UX, approve/verify image.edit permissions, run a separately authorized bounded live quality test, validate cross-window/file behavior, version the app/tool together, and explicitly authorize deployment.

## Validation

Unit tests exercise the real portable core and mock image transport. Storage integration tests use the Anna adapter, sequenced receipts and ETags, including missing uploaded files, failed writes, conflicts, replay and cancellation. Browser mocks exercise unavailable state, preview/explicit apply, discovery preservation and IndexedDB reload/cleanup. Pyodide and standalone binary smoke tests also execute the equipment transition.

See `../releases/EQUIPMENT_20261024.md` for final verification counts and known release conditions.
