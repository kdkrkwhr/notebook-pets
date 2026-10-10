# Actual Anna evolution verification — 2026-10-10

## Result: blocked at provider generation, not a visual pass

The real machine/light companion was level 10, stage 2. Its baby portrait and current juvenile portrait were read from APS. The user confirmed the juvenile picture is a manually regenerated replacement; it is **not** the original mismatched result. Do not claim to have compared the original reported failure.

The baby image was copied to the existing private `notebuddy-erasure-check` app under `verification/evolution-20261010/stage-1.png`. A new storage client obtained a fresh download URL; downloaded bytes matched the source SHA-256. The production game and art index were read again after testing and matched their pre-test values exactly.

No new evolution image was returned. Stages 3 and 4 were not generated. The production album, game, release branch and pinned review candidate were not changed.

## Actual requests

| Path | Attempts | Result |
| --- | --- | --- |
| Installed CLI ImageBridge, isolated development app | 2 | Immediate HTTP 502 gateway HTML response |
| Actual Anna app runtime RPC, default route | 1 | `APP_PROVIDER_ERROR`, fal.ai HTTP 404, `Path /image-to-image not found` |
| Same runtime RPC, `GPT Image 2` hint | 1 | Same provider path error |
| Same runtime RPC, `Nano Banana 2` hint | 1 | Same provider path error |

Runtime requests used the registered window's authentication and the request shape in Anna's own host bridge. They called `image.generate` only, with the develop prompt, n=1, 1024x1024, low quality, 1K and a fresh previous-image URL in `reference_image_urls`. No `storage.set` call was made to the production app and no gameplay mutation was requested. Generated results would have been saved only in the isolated verification app.

Model hints may silently fall back. Failures did not report the resolved model, so these results do **not** prove two different models were selected or that all Anna image models are broken. The provider error indicates an unavailable routed image-to-image endpoint; it does not establish which platform/provider configuration is responsible. Failed-request billing was not independently audited and is not claimed to be zero.

Sources: [Anna image API](https://anna.partners/developers/reference/host-api-image.md), [official host bridge](https://anna.partners/static/js/anna-app-host-bridge.js). The image API documents reference inputs and recommends `image.edit` for a single reference, but editing requires a separate manifest permission and user grant. This verification did not expand grants or replace the review candidate to try that alternative.

## What passed and what did not

- Passed: actual reference retrieval, separate APS upload, fresh-client retrieval and byte integrity, production-data preservation.
- Existing local evidence remains: 32 unit tests and 39 browser scenarios covering automatic triggering, reference arguments, effects, retries and persistence with a mocked image provider.
- Not passed: real reference-conditioned generation, visual identity across the four stages, and the final deployed automatic UI flow. Local tests are not evidence for these items.
- The actual 0.2.1 UI stayed installed. Runtime-only diagnostic calls isolate provider behavior; they do not certify the new develop UI as deployed.

## 1.0 consequence and next check

Previous-image-based evolution is now in the agreed 1.0 scope. Treat the live generation failure as a **1.0 blocker**, distinct from the earlier accepted first-creation storage limitation. Do not mark image continuity complete or fall back silently to unreferenced generation.

Next resolve a functioning reference route: verify the actually selected model and its provider route, or evaluate the documented single-source `image.edit` route in a separate developer candidate with the required explicit grants. Only after one real stage-2 result succeeds should the same image be chained through stages 3 and 4, visually compared, then tested through the deployed candidate's full UI. Do not keep sending identical failing paid requests. No provider support message was sent.

Personal source pictures, signed URLs, authentication and the full save are excluded from Git. A local comparison report displays only the two existing images and clearly labels that no new verification image was produced.
