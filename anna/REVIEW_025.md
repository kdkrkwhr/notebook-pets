# Review candidate 0.2.5 — 10 October 2026

The owner requested a fresh account reset and replacement of the existing review candidate with the currently uploaded app.

## Confirmed submission

- App: Notebuddy, ID 450, `@kdkrkwhr/notebuddy`.
- Official `apps submit-review notebuddy` returned `pending_review` with candidate **0.2.5**. A separate status request confirmed both values.
- Immutable app version ID: **1242**; source tag `anna-v0.2.5`, source commit `89298ba`.
- Game tool: **0.1.13**, frozen Executa version **704**.
- The app is still **unpublished**. Submission is not approval or public release.
- No cancellation was needed: the supported submit-review operation re-pinned the candidate from 0.2.1 to 0.2.5.

The English store description now explains drawing-only creation, rechargeable walks, care reactions, AI allowance, retry behavior and data controls. It does not advertise the separate unreleased portrait-analysis evolution feature. Four screenshots were recaptured from the actual 0.2.5 UI with the real game engine in an isolated in-memory local harness: first meeting, companion/care, care/album, and the drawing editor. AI was disabled; no private account data or generated personal portrait was used. Mutable listing metadata was synchronized independently of the immutable code version.

Homepage, issue/support page, versioned privacy notice, logo and all four uploaded screenshots returned HTTP 200 before submission. Privacy points to `anna-v0.2.5/anna/PRIVACY.md`. Full code verification is recorded in [incremental releases](INCREMENTAL_RELEASE.md): 40 unit tests, 40 browser scenarios, and successful Windows/Linux CI.

## Account reset

Existing idle Notebuddy windows were closed. The requested account's game, chat and portrait index were removed with conditional writes/deletes; two portrait files were deleted. A separate read-only check confirmed all three records absent. No replacement companion was created by this operation. Later user activity can create new data and is not part of this reset.

[Review status in the developer console](https://anna.partners/developer?app=450)
