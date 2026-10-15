# Notebuddy 0.3.2 — first artwork waiting screen

Drawing-based first creation uses a dedicated waiting card during checking, generation and saving. The default random portrait and the game are hidden until the custom portrait is saved and its URLs are loaded. A failed attempt remains on the recovery card, including after reopening when its source record is saved. Retry keeps the same companion; a received result retries saving without another AI request. Choosing the default appearance explicitly reveals the game. Random starts are unchanged.

English/Korean copy, reduced-motion support and a 360px layout are included. Browser validation: the existing 41 recovery cases and two new waiting/reopen cases passed. All 40 unit tests and strict manifest validation passed. These are isolated UI tests, not a new paid live Anna generation check. The game executable stays at 0.1.14.

The historical Git tag `anna-v0.3.2` belongs to an earlier development snapshot and is preserved. This release uses `anna-release-v0.3.2`. The 0.2.8 privacy notice remains applicable; no data collection or AI provider behavior changes. The working-draft update initially retained review candidate 0.2.8; the explicit review replacement below supersedes that state.

## Review replacement — 11 October 2026 (KST)

The user reported completing the normal live drawing-generation check on Anna and explicitly requested submission of 0.3.2. Live failure/reconnection verification remains deferred at the user’s direction; isolated recovery tests passed, but are not presented as a completed live check.

Release source `6b6372e` passed both GitHub CI workflows on the release branch and `anna-release-v0.3.2` tag. All eight listing links (homepage, support, privacy, logo and four screenshots) returned HTTP 200. The existing description and screenshots remain applicable; the 0.2.8 privacy notice still describes the unchanged data handling.

Submission confirmed by a fresh API read at 2026-10-10T15:48:18Z: app 450, review_candidate_version `0.3.2`, immutable version ID `1256`, status `pending_review`. The game tool remains `0.1.14`. No public release or user-data reset was performed.
