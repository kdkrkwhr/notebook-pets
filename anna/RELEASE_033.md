# Notebuddy 0.3.3 — AI walk stories

About half of successful quiet walks are selected deterministically from their action ID for a short story. This is approximately one quarter of all walks under the existing 50% quiet outcome rule, not a guaranteed frequency. Game rules and tool 0.1.14 remain unchanged. A story replaces the separate care-reaction AI request for that walk.

One AI request supplies a scene, two choices and both endings. The story uses only the pet name, species, element and language; chat and drawings are not included. Choices do not invoke game actions, grant rewards or request AI. Invalid, refused or unavailable AI output falls back to a complete prepared story. Text is rendered with textContent, never HTML.

The app reserves a basic story before the paid request, persists one current episode and up to 64 recent request IDs in `notebuddy/walk-story-v1`, and resumes choices without paid retries. A pending story must be completed before another walk in that window. Existing-row conditional writes preserve the first committed choice across windows; an old AI response cannot replace a completed fallback choice. The platform's previously documented missing atomic first-row creation remains a limitation. This feature does not claim exactly-once billing across simultaneous initial clients.

Reset/removal includes the story key. Partner checks and local generation tokens reject responses after reset or replacement. The public data notice, in-app notice and bilingual READMEs describe this storage and AI use.

Validation: 48 unit tests and 45 isolated browser cases passed; strict manifest validation passed. Coverage includes AI failure, invalid output, duplicate choices, concurrent choices, interrupted generation resumed with the fallback, late response after reset/removal, unchanged XP on selection and reopening without generation. Desktop and 360px story/ending views were inspected; no horizontal overflow. Live Anna AI generation was not performed for this feature. The existing 0.3.2 review is kept separate from this working candidate.
