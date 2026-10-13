# Notebuddy 0.5.0 — connected dungeon rooms

App **0.5.0**, game tool **0.3.0**. Test deployment pending.

Replaces disconnected movement over a painted backdrop with shared walkable tile geometry and three to six connected rooms per expedition. Different enemies, carried HP, a recovery room in longer layouts, final guardian rewards, visible gates and a room counter give the journey a beginning and end. Four-direction species rigs use portrait colors and alternating steps. This simplified avatar preserves the original saved portraits but does not reproduce every custom detail. No image-generation call is added.

Results, room outcomes, one walk charge and any final reward commit atomically using the existing retry receipt protocol. Failures stop before remaining rooms. Existing single-boss saves stay readable and replayable. Pause, 3x, skip, mobile layout and reduced motion remain supported.

## Validation

Pending final CI and deployment. Engine regression, visible-floor route samples, room HP continuity, reward replay, lost-response recovery and six-room browser playback are covered. Existing review 0.3.4 and listing must remain unchanged during test deployment.
