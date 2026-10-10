# Next Anna update — prepared on 2026-10-10

See [1.0 release criteria](V1_READINESS.md) for the frozen product scope and outstanding evidence.

## Deployment boundary

The submitted candidate remains app **0.2.1** (version 1219), Executa **0.1.9** (version 694). The last live query on 2026-10-10 returned `pending_review`; working draft revision 17 was `ready`. No upload, version cut, resubmission or release-branch update is part of this work. The next version number is intentionally not assigned before packaging.

## Prepared user-facing release notes

- Only 72 baby pictures are bundled. Evolution automatically creates new personal artwork from the latest previous saved appearance and consumes Anna image allowance.
- A growing/saving animation reveals the new portrait after storage completes; reduced motion is supported.
- Interrupted automatic requests do not repeat on Refresh/reopen; manually retry after checking other windows and allowance.

- Get started with care, a first conversation and the growth album from the new welcome guide.
- Retry an uncertain care result beside the action, keeping the same request to avoid duplicate rewards.
- See chat and portrait progress, saving failures and successful saves beside the relevant controls, in English or Korean.
- Retry saving an existing reply or generated portrait without asking AI to generate it again. Keep the window open while saving is unfinished.
- Keep the matching saved portrait visible during temporary URL lookup failures.
- Clear old pending work when another window replaces the companion.

## Verification and remaining evidence

Local verification passed on 2026-10-10: **32 UI unit tests and 39 browser tests (38 full-suite plus the final battle/evolution regression)**; the unchanged Python storage/protocol suite previously passed 47 tests, strict manifest validation and `git diff --check`. Browser tests use an isolated host, including permission denial/recovery → first companion → care → chat → portrait → reload. They also cover failed generation, failed writes, lost responses, retry without duplicate AI generation and English/Korean feedback.

This is **not** evidence of a new Anna account's installer or actual first permission grant. No separate authenticated test account is available for that check. Existing production saves must not be erased or rerolled to simulate a new account.

Before publishing the next candidate: run the prepared source checks, choose/bump the app version, refresh listing screenshots for the new guide, package and inspect the bundle, then verify the fixed candidate in a separate test installation/account. Record first permission grant and denial/regrant, game and AI save/reopen behavior, version IDs and review response. Do not replace the current candidate merely to run these checks.

## Accepted limitations

- Distributed first creation still lacks a proven atomic create-if-absent primitive. Local protection and regression passes do not remove that race.
- In-flight requests, old runtimes and platform retention remain subject to the published deletion/reset limitations.
- Pending AI replies/portraits and uncertain action requests exist only in the current window. Closing it loses the retry context; reopen and check saved state before issuing a new request.
- A private support route remains unconfirmed. Public GitHub issues must not collect personal conversations or credentials.
- Mobile enablement is deferred by the user.

The user accepted submission with the documented platform limitations. Historical documents calling these submission blockers or saying submission has not happened are superseded by REVIEW_READINESS.md and the receipt in HANDOFF.md.

Automatic evolution uses the documented `reference_image_urls` API. Reference-capable provider availability and actual visual fidelity still need live verification. The new privacy/listing copy must ship together with this behavior; the currently submitted release copy remains unchanged.

## Live verification failed — 2026-10-10

Actual reference-conditioned generation returned a provider endpoint 404; no new evolution image was obtained. APS reference save/reopen passed and production data remained unchanged. This blocks the agreed 1.0 image criterion. See [the verification record](EVOLUTION_LIVE_VERIFICATION.md). Do not describe the develop implementation as provider-verified.

## Rechargeable walks

Walks now hold up to 5 charges and recover one every 300 seconds, including offline time. Existing saves start with 5 charges once. Midnight does not refill charges. Each walk exclusively yields quiet time (50%), XP (30%; 10/20/30 equally likely), or an encounter (20%). Base expected walk XP is 6; the existing sleep bonus and level cap still apply. Battles remain limited to 5 per KST day. Replayed requests reuse the same result without spending or rolling again.

## Artwork first meeting

Optional upload/drawing input, local validation, explicit vision check, referenced baby generation and distinct refusal/check/generation/save failure recovery are implemented on develop. See [USER_ARTWORK.md](USER_ARTWORK.md). Real vision/provider behavior remains unverified; do not ship until the existing image route blocker is resolved and this flow is tested live. Screenshots and the deployed privacy URL must be updated with any candidate that includes this behavior.
