# Notebuddy 0.5.0 — connected dungeon rooms

App **0.5.0**, game tool **0.3.0**. Deployed to the owner’s Anna test app on 2026-10-13.

Replaces disconnected movement over a painted backdrop with shared walkable tile geometry and three to six connected rooms per expedition. Different enemies, carried HP, a recovery room in longer layouts, final guardian rewards, visible gates and a room counter give the journey a beginning and end. Four-direction species rigs use portrait colors and alternating steps. This simplified avatar preserves the original saved portraits but does not reproduce every custom detail. No image-generation call is added.

Results, room outcomes, one walk charge and any final reward commit atomically using the existing retry receipt protocol. Failures stop before remaining rooms. Existing single-boss saves stay readable and replayable. Pause, 3x, skip, mobile layout and reduced motion remain supported.

## Validation

Final source `e1c136e` passed Windows and Linux [Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38367288510) and [engine CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38367288746). Engine: 177 tests; Anna storage/protocol: 57; JavaScript: 54; browser: 67. The original 0.4.2 DOM movement test was updated to observe the canvas camera because the animated companion now renders on canvas. Focused final mobile/six-room checks also passed locally.

The uploaded Windows/Linux tool packages came from successful Anna CI 38354060986 (`2e9eb54`). The final two-file UI polish changed only room indicator placement and sanctuary HP labels; tool source is identical. Final-source CI also built both packages successfully.

Visible-floor route samples cover all room orientations. Tests cover stable 3–6 room plans, carried HP, recovery, early defeat, final-only reward, same-request replay, prior single-room records, lost-response recovery, six-room playback, pause/resume and distinct directional frames. Desktop room 1/2/4/6 and 360px screenshots were inspected. Live full combat was not executed against the user’s save.

## Anna deployment

- App **0.5.0**, immutable version ID **1352**; working revision **37**, **114** bundle files ready.
- Tool **0.3.0**, Executa version ID **739**, both platforms published. Installed as reserved **0.0.0-draft**; actual agent reports **0.3.0 / loaded=true**.
- Installed UI verified **Connected**, new room/pause controls, art **ready**, and directional tiled-room renderer. The Anna dashboard had retained the old app context; a full dashboard reload loaded the new controls. Read-only preview / saved replay only, without walk, entry, reset or paid AI requests.
- Game, artwork and conversation storage values deeply matched the pre-install snapshot after UI verification. No data reset or rewrite was performed.
- Existing **0.3.4 pending_review** candidate and shared listing preserved. This is owner testing, not a public release or new review submission.

## Remaining scope

Directional avatars are species-based pixel rigs colored from the portrait, not an exact multi-view recreation of each custom pet. Manual navigation, branching room choices and individually drawn walking sprites remain future work. Prior saved expeditions intentionally replay as one room; new entries use the 3–6 room rules. Individual pet balance still benefits from playtesting; portrait-generation behavior is unchanged.
