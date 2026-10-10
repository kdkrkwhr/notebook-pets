# Notebuddy 0.3.2 — first artwork waiting screen

Drawing-based first creation uses a dedicated waiting card during checking, generation and saving. The default random portrait and the game are hidden until the custom portrait is saved and its URLs are loaded. A failed attempt remains on the recovery card, including after reopening when its source record is saved. Retry keeps the same companion; a received result retries saving without another AI request. Choosing the default appearance explicitly reveals the game. Random starts are unchanged.

English/Korean copy, reduced-motion support and a 360px layout are included. Browser validation: the existing 41 recovery cases and two new waiting/reopen cases passed. All 40 unit tests and strict manifest validation passed. These are isolated UI tests, not a new paid live Anna generation check. The game executable stays at 0.1.14.

The historical Git tag `anna-v0.3.2` belongs to an earlier development snapshot and is preserved. This release uses `anna-release-v0.3.2`. The 0.2.8 privacy notice remains applicable; no data collection or AI provider behavior changes. Review candidate 0.2.8 is not automatically replaced by a working-draft update.
