# Notebuddy 0.2.8 review replacement

0.2.8 uses game tool 0.1.14 and includes the first-meeting reset from 0.2.7 plus spacing and form layout refinements. Direct evolution image editing is excluded; the tested 0.2.5 portrait behavior remains.

## User flow verified on Anna

On 11 October 2026 (KST), the user authorized live reset verification before review replacement. Pending cleanup completed into the first-meeting screen with no name or companion selected. Both Random and Drawing options were available. A random companion named Mochi was explicitly created at level 1 and persisted across a full page reload. A second explicit reset removed this verification companion and returned to a blank first-meeting screen. No image generation or care-AI request was needed for this live check. Drawing creation and recovery paths passed isolated browser tests; this check did not claim a new paid live drawing-generation result.

## Presentation and listing

Card padding and vertical spacing, album actions, form control alignment and dialog labels were adjusted. Narrow screens use readable title wrapping and three-column care actions with a full-width final action. English and Korean at 360px showed no horizontal page overflow. Desktop, mobile, welcome, game and reset views were visually inspected.

Four English listing screenshots were recaptured from the 0.2.8 UI using the real Python rules with isolated in-memory storage and AI disabled. They contain no production-player data. The description explains that Start over returns to first meeting. Listing and in-app privacy links both target anna-v0.2.8, whose notice describes the new reset flow.

## Validation

41 browser recovery cases passed on the release candidate; strict manifest validation passed. The unchanged server 0.1.14 previously passed 52 storage/protocol tests and Linux/Windows package CI run 38061043894. UI source CI is tracked at commit 5d2df2b. Confirm remote link checks and final review_candidate_version after submission; no public publishing action is required.
