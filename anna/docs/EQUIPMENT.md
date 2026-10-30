# Item fitting implementation · 2026-10-24 · not deployed

This document describes the fitting flow on Anna's `release` track. The initial implementation was disabled. The app1.4.17/tool0.9.8 candidate enables it after the live checks below; current deployment and review status is recorded in HANDOFF.md.

## Release gate and API evidence

Both source fitting gates are enabled for app1.4.17/tool0.9.8 after four successful real image edits and real APS/two-window checks. The original implementation kept both gates off until this validation. Explicitly disabled configurations still reject fitting. Anna deployment/installation/review status is recorded separately in HANDOFF.md; source activation alone does not establish deployment.

[Anna team response, October 23](https://forum.anna.partners/t/image-edit-fails-with-provider-errors-readerror-and-fal-ai-image-to-image-404/400/2) was read through the forum's topic JSON endpoint. It documents one `image_url`, `prompt`, `n: 1`, `model: 'fal-ai/nano-banana-2'`, and `{timeoutMs: 240000}`. The installed `@anna-ai/app-runtime` namespace exposes `image.edit` and documents the single-image request. The implementation uses exactly that contract, with no invented multi-reference parameters or masks. The team's GPT Image 2/mask routing fix is scheduled for October 30 in host 1.1.0-beta.201; deployed availability has not been verified.

The experimental transport edits the current portrait using the item's textual description and attachment constraints. It does **not** take the catalog illustration as a second reference, nor claim to reproduce its exact artwork. The shipping approach is a generated interpretation of the item rather than exact reproduction of its catalog art. Four head/neck/back/aura samples were visually inspected; the UI states the difference before application. A user preview is required before application; it is not an automated quality guarantee.

The initial implementation declared only `image.generate`. The October 24 follow-up adds `image.edit` to the source manifest under the user's explicit approval for item fitting. The validated1.4.17 source enables both fitting gates; production working/review manifest changes and installed verification are recorded separately in the release handoff. The existing owner's app450 grant already reports `allowEdit: true` and `maxPerCallEdit: 1`; no new platform grant or security setting was changed. The tool distribution manifest only synchronizes its new command/argument schema, with unchanged capability declarations. See [Windows preflight and remaining billing gate](../releases/EQUIPMENT_PREFLIGHT_20261024.md).

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

Local mocks alone do not establish real provider or platform behavior. The1.4.17 follow-up adds four successful real provider samples and actual APS/file/receipt checks with two local windows and Python processes; see RELEASE_1417.md. This does not prove exact catalog-art matching, every species/item combination or physical/native client behavior. Installation and final review submission still require their own verified deployment evidence. The user authorized bounded real tests, activation, deployment and normal new-candidate review replacement.

## Validation

Unit tests exercise the real portable core and mock image transport. Storage integration tests use the Anna adapter, sequenced receipts and ETags, including missing uploaded files, failed writes, conflicts, replay and cancellation. Browser mocks exercise unavailable state, preview/explicit apply, discovery preservation and IndexedDB reload/cleanup. Pyodide and standalone binary smoke tests also execute the equipment transition.

See `../releases/EQUIPMENT_20261024.md` for final verification counts and known release conditions.
