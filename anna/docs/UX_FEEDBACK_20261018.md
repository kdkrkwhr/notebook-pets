# Waiting and recovery feedback — 2026-10-18

The owner asked for a UI/UX check of states that can look broken despite correct gameplay, especially slow image requests. This task changes presentation and local feedback only. No paid AI requests, game rules, request counts, automatic retries or saved-data formats were added.

## Findings and changes

| Situation | Previous ambiguity | Updated feedback |
| --- | --- | --- |
| First portrait | Static stage text could appear stalled during a long response | Animated activity mark, current stage, elapsed time and delayed-response guidance |
| Home pixel generation | Disabled controls and an unchanged world offered little visible progress | Explicit generation, download, save and validation stages; no missing-image warning during active work |
| Home on small screens | Disabled appearance choices and actions pushed progress below the footer viewport | Temporarily hide irrelevant controls while working; keep status and waiting guidance visible |
| Evolution | A slow portrait could look like an unfinished rules action; Escape could hide the only active feedback | Show portrait generation separately from saving; prevent Escape from dismissing the dialog while work is active |
| Direct chat | Input disabled with no clear reply-in-progress indicator | “Thinking of a reply”, elapsed time, delayed-response guidance, then saving; clear the indicator on success/failure |
| Save-only chat recovery | Unclear whether retry was another AI request | Explicit saving state, preserving the existing save-only behavior |
| Care, story, personality and decoration | Progress was mostly plain static text | Consistent activity feedback at the relevant existing status location |
| Completed/failed operation | A stale spinner could imply continuing background work | Clear the activity and clock in completion paths; retain the result/recovery message and relevant controls |

The clock measures time elapsed in this UI operation; it is **not a completion percentage or provider estimate**. After 30 seconds without a result, eligible waiting states show neutral “still waiting” guidance and explain that another request is unnecessary. This does not claim a provider has exceeded its normal response time. Saving and local validation have their own text rather than continuing to claim image generation. Reopening an interrupted request does not invent active progress or submit another AI request.

English and Korean are supported. Reduced-motion users get a stationary indicator. The elapsed clock is hidden from screen readers to avoid announcing every second; textual status changes remain available. Supplemental details are visible only while work is active, so idle screens gain no permanent explanation panels.

## Verification

Focused free browser tests: **17 passed** (six activity, five evolution and six home cases). New cases cover a 30-second wait without duplicate requests, completion cleanup, home generation failure/default fallback, separate image-saving feedback under a held upload, chat save-only retry, slow birth portrait, evolution Escape handling, Korean guidance, reduced motion and failure restoring typed chat text. Desktop and 375 × 812 screenshots were inspected; the mobile progress footer fits without scrolling past disabled controls.

JS state tests **92** and strict manifest validation passed locally. Windows/Linux CI **39113368771** passed on both OSes at **fc92f2c**: **129 browser**, **92 JS**, **73 storage/protocol** tests, strict validation and standalone executable build/smoke checks. Shared CI **39113368782** passed all three jobs. Final wording-only **60569b1** was followed by another successful **17-case Chromium** run. All provider responses in browser checks are synthetic fixtures; no Anna credit was spent.

The first Windows CI run timed out waiting for the birth-image stage. Local Chromium reproduced it: the new test advanced before asynchronous artwork selection completed, leaving the required name form unsubmitted. Waiting for the editor to close and its selected preview to appear resolved the test ordering issue; all 17 focused cases then passed on Chromium. The test retains diagnostic capture if the stage is not reached. Story clearing and reset/closed evolution dialogs also stop their activity feedback.

## Installed owner app

UI source **c968ae8 / fc92f2c / 60569b1**, owner draft **1.4.11 / revision 85 / installed 0.0.0-draft**. Cloud tool remains **0.9.5 / Executa 774**, loaded/running; no game-tool binaries were replaced. Bundle **172 files / 171337260 bytes**, working content hash `91b26ae001a6739fef2bf77353a09df52753b2c3bafce12beb9bfd53608da7e8`.

Eight changed installed module/style hashes match source. Reopened UI reports Connected, has no notice, mounts the new activity elements and shows no stale active indicator. The actual owner home also reopened with its saved directional character and no missing-image warning. Game inspection ETag and artwork/chat/story/personality values and ETags are unchanged. The complete frozen review row **1.4.11 / ID 1443** and all listing fields remain unchanged. The first push was rejected for platform-normalized storage declaration drift; restoring the exact existing 0.9.5 protocol manifest allowed the working-draft push and installation. No new review cut, submission, public Anna release or web change.

## Scope

This is a focused pass over waiting, empty/loading and recovery states in the main companion/home/evolution/chat/story flows, not a claim of exhaustive usability research. Existing first-creation concurrency constraints, image-provider variability and physical PC execution limits are unchanged. The current review listing/candidate and public web remain untouched unless the owner separately requests them.
