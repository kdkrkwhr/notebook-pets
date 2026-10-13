# Notebuddy 0.6.1 — a quieter home and focused walks

App **0.6.1**, unchanged game tool **0.4.0**. Deployed to the owner’s Anna test app on 2026-10-13.

The home screen now prioritizes the companion, care, and conversation. Decorative English section labels and the repeated signed-in hero are removed. Refresh moves to the header. Desktop pet/chat cards share a balanced row with care beneath; mobile places care before chat. Section names are direct, and discovered dungeons use compact entry cards only while an active discovery or paid checkpoint exists.

The previous-expedition button and persistent dungeon history section are removed. Historical results stay in storage for compatibility and are not replayed from the home screen. No saved game is erased.

Quiet-walk stories now open in a native modal, from generation through the two choices and ending. Escape or close preserves an unfinished story and exposes **Continue walk** beside care controls. Reload restores a pending story without another game action or AI request. Finished stories remain saved but do not reopen or occupy the home screen. A completion button returns to the companion. English/Korean controls, keyboard focus and narrow-screen layout are supported; story text keeps its original generated language.

## Validation and deployment

Local JavaScript **55** and browser **71** tests passed, along with strict manifest validation. Coverage includes modal focus/escape, close/resume/reload without new AI or game calls, completed-story hiding, fallback stories, mobile care-before-chat order, and the existing care, portrait, reset and dungeon flows. Desktop/360px home and story screenshots were inspected. The browser fixture now gives incidental quiet walks deterministic non-story receipts; story tests explicitly choose an eligible receipt.

Source **11c9ddc** passed Windows/Linux [Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38416264687) and [engine CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38416265067). The game tool was unchanged: installation reused **0.4.0 / Executa 742**, with the previously verified Windows/Linux artifacts from 0.6.0. No game balance, image generation or backend storage logic changed.

- App **0.6.1 / version ID 1357**, working revision **39**, **116 files ready**, installed as **0.0.0-draft**.
- Actual installed UI: **Connected**, header refresh, no history button or inactive dungeon section, a native story dialog. The existing pending story was opened, closed, and resumed with its two choices; no ending was chosen and no walk or AI request was issued.
- Actual tool: **0.4.0 / loaded=true**. Game, art, chat **and walk-story values** remained deeply equal to the pre-install snapshot after live UI checks at **2026-10-13T14:49:37Z**.
- Existing **0.3.4 pending_review** candidate and shared listing preserved. No new review or public release was submitted.
