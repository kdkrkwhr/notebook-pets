# Our memory notebook

The notebook brings actual milestones and explicitly saved conversation messages together. It does not call text or image AI.

- The shared Python engine retains meeting and evolution evidence, plus the first recorded guardian victory for each of the five regions. These at most nine milestones are saved with the existing gameplay transaction and receipt. Reading the notebook never writes game state.
- Existing reliable birth/evolution history is shown without a migration write and retained on the next successful game write. Missing history, stage numbers and cumulative win counts do not create earlier events or dates. For an older companion, a regional victory is the first one recorded by this feature, not a claim about its entire past.
- A completed visible conversation message can be saved explicitly. Its original wording is retained independently of the rolling conversation. Removing it from the notebook leaves the conversation intact.
- Saved messages are bounded to 20, with at most 3,000 characters per message and 40,000 UTF-8 bytes for the document. A full notebook reports the limit without silently evicting earlier messages.
- Saved messages use the app-scoped `notebuddy/memories-v1` APS record and current pet identity. Each conditional-write attempt checks the active companion after reading the record. Existing records require ETags. Failed saves can be retried without requesting AI; repeated saves of the same message do not duplicate it.
- Confirmed new-companion reset clears this record; confirmed data removal writes the same erasure marker used for other app records. Existing Anna APS initial-create and cross-store concurrency limits still apply. The notebook is not a cross-platform sync or export feature.

English, Korean, Japanese, Simplified Chinese and Traditional Chinese labels are bundled. Stored conversation text is never automatically translated. Current deployment evidence belongs in [HANDOFF](../HANDOFF.md).
