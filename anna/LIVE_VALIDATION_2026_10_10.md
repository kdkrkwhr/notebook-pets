Latest submission attempt: the user authorized 0.3.0 on 10 October. Main app upload also hit WAF 403; [current submission record](REVIEW_READINESS.md) supersedes the earlier hold instruction and revision-17 snapshot below.

# Live validation — 10 October 2026

## Decision

Do not replace the review candidate yet. Core image generation and care reactions now have real-provider evidence, but a new hosted bundle could not be uploaded: Anna's WAF returned HTTP 403. The submitted app 450 remains pending_review at 0.2.1, version ID 1219, working revision 17 ready. No production game or album write was requested.

| Check | Observed result | Scope / remaining gap |
| --- | --- | --- |
| Evolution 1→2→3→4 | Actual vision extraction and text-only image generation succeeded. Cream/gold body, flame, forehead diamond and chest motif persist; body, limbs and armor visibly grow. | One machine/light sample, not a guarantee for every species. Eye/line rendering differs. Diagnostic runtime calls, not a deployed new UI. |
| Saved stage-3/4 images | Uploaded to separate test APS; fresh clients downloaded identical SHA-256 bytes. | No production album changes. |
| Artwork check | Actual UI accepted the selected PNG and saved its extracted features under the isolated app. | Source was an existing game illustration, not a real photograph; real-provider refusal accuracy not certified. |
| Artwork birth image | Actual image API generated from checked features plus the test game's real random mammal/fire traits. | Separate diagnostic call after local UI upload failed; not an end-to-end birth success. |
| Species precedence | First sample copied the robot's metal body despite mammal assignment. Fixed birthPrompt to include authoritative game anatomy and prioritize assigned species/material. A second real sample became furry with ears/paw pads and fire motifs. | Prompt guidance improves the observed case; no universal output guarantee. |
| Care AI | Feed, play, attendance, snack and quiet walk produced real LLM replies in the new UI; first three survived a complete page reload. | Official local harness with real APS/AI, not hosted installation. |
| Walk energy | 5/5 → 4/5 after walk; after over five real minutes, Refresh read 5/5. Quiet outcome narration matched the result. | No clock manipulation or game-state seeding. |
| Reset | UI reset replaced only the isolated test companion, cleared its app chat/art index, and restored the new name after reload. | Existing user companion unchanged. |
| CI | All runs for 754b9f3 passed, including Windows/Linux UI, protocol/storage and packaged executable smoke tests. | Subsequent species-prompt correction passed 39 local unit tests, four affected browser scenarios and strict validation. |

## Release blockers / test environment issues

1. Hosted candidate upload: independent app **495**, `notebuddy-validation-oct10`; new independent tool `tool-kdkrkwhr-notebuddy-validation-oct10-t3e5cr38`. Both platform packages came from successful develop CI run **38033745503**. Working bundle file upload to `/api/v1/developer/apps/495/working/bundle/file` returned WAF 403 twice. Request ID from the diagnostic attempt: `a483dec30b0cf4f8-HKG`. No review submission, app release or support message was sent. Do not describe this incomplete working draft as installed or validated.
2. Official CLI local harness 0.1.57 required test-only compatibility corrections: supply the documented `executa_tool_id` for tool storage minting; explicitly choose app scope for the UI's two app-owned KV keys (the CLI otherwise omitted scope and read user-scoped old test tombstones); set Python UTF-8 on Windows. The tombstones were not cleared. An initially incomplete test source copy was corrected by including all Python modules. These are test environment corrections, not proof of a production isolation defect.
3. Local file upload: upload_init succeeded, but the browser PUT failed with `Failed to fetch`; a separate 2-byte text upload reproduced the same step without AI. Exact network/CORS cause remains unconfirmed. It prevents certifying artwork select→upload→generate→save through the local UI. Do not bypass browser security or call a separate server upload an end-to-end UI pass.

## Next verification

Resolve the supported hosted bundle upload path, install a candidate containing the final UI and matching tool, then verify artwork birth (photo and drawing), automatic evolution effects/save/reopen and care reactions in that hosted installation. Update screenshots, listing and the deployed privacy notice together before repinning review. New ordinary-account installation is still separate from this developer-account work.

## Evidence handling

Sanitized local results are in the mentor workspace under `output/anna-release-check-results/` and `output/anna-evolution-live/`. The four-stage comparison is `text-four-stages.html`. Personal image bytes, full saves, signed URLs and credentials are excluded from Git. The private test app and its test records remain identifiable; no production save was initialized/reset/removed by these checks.
