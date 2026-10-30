# Home life and our memory notebook

The user selected recommendations 1 (furniture-aware home life) and 2 (our memory notebook) and asked to proceed. This document records the implementation choices under that authorization.

## Experience

- A companion visits its placed resting nest, bookcase and plant. Existing personality affects visit order and pause lengths. Short localized activity captions make the behavior legible. Existing sprites and portrait-derived defaults retain their actual poses. No AI, new image generation, furniture movement, gameplay rewards or save writes occur while watching.
- A memory notebook beside the growth album collects the first meeting, actual evolution events and first wins for each of the five dungeons. It also holds up to 20 messages explicitly saved by the user from the visible conversation. Users may remove saved messages without changing the conversation.
- Events show only known dates. Existing reliable history may be used; an old cumulative win count must not invent a date or victory. Milestones must survive the rolling gameplay history and action replay must not duplicate them.
- The notebook has an accessible responsive dialog, clear empty/loading/error states, five-language labels, original conversation text, and no AI requests. Saved messages use a separate bounded app record scoped to pet identity and reset/deletion lifecycle. Existing pet, artwork, conversation and reward data remain intact.

## Approaches and decision

Use the existing Python route planner and derived world payload for home activity; JavaScript only animates it. This preserves one portable rules implementation. Add bounded milestone records to the shared Python core and project them through the Anna adapter; store explicit conversation keepsakes in Anna app APS with existing ETag handling. A UI-only reconstruction would lose events after history pruning; a new backend is unnecessary.

## Delivery

Implement in an isolated worktree, with focused tests first and full relevant regression/Windows-Linux packaging checks. Bundle as one tested Anna update. Commit/push and deploy the owner's working test app and changed tool packages; verify installed files and actual running tool. No review cut/submission or listing change is authorized. Apply the AGENTS.md shared-Web workflow to compatible shared changes, preserving platform-specific adapters. Record exact versions/revisions, checks and limits in release notes and the two-entry handoff.

## Boundaries

No generated diary prose in this first bundle; the user requested the two features and automatic AI was explicitly excluded in the implementation summary. No fabricated earlier memories, new currencies/rewards, manual furniture editor, poses or paid calls. Initial APS creation has the platform's pre-existing non-atomic creation limitation; do not claim stronger storage guarantees.
