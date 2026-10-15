# 0.10.1 · Item book after meeting, art choice layout, dungeon scene fix

App **0.10.1**, unchanged game tool **0.6.0**. Owner test deployment was verified on **2026-10-14 KST**. The shared listing and pending **0.8.1** review remain the review materials.

## Changes

- **Item book only after meeting a companion.** The item book entry now lives inside the companion view, and the title menu is Start / Privacy only. Before a companion exists, the item book is not shown.
- **Art choice layout.** On the welcome form, "Draw or choose a photo", the reference preview and the usage note no longer overlap: the button and preview sit centered in one row and the note wraps below.
- **Dungeon scene could not load.** The home screen shows the companion's signed storage URLs as ordinary images, so the browser cached them without CORS headers. The dungeon then read the same URL as a CORS image for pixel conversion, reused the cached copy and failed with "The scene could not load". Dungeon portraits are now fetched with `cache: 'no-store'` and decoded with `createImageBitmap`. This was independent of the 0.10.0 theme.

## Verification

- JavaScript **79**, browser **89** and strict manifest validation passed locally. Browser checks now confirm the item book is hidden before creation, the art button and preview do not overlap and stay vertically centered, and dungeon portrait loads bypass the HTTP cache.
- Sources **7f2d132** and **8622f583c57c6c4644616da4588f08675dffefb4** passed both Windows/Linux jobs of Anna CI and the engine workflow. The unchanged tool was not republished.

## Owner deployment

- `apps push` produced working revision **47** (143 ready files, no upload block). `apps cut 0.10.1` created immutable version ID **1382**, froze Executa version **746 (0.6.0)** and reused both cached binaries. Installed to the owner as **0.0.0-draft** through the official working-install endpoint; the actual agent reports tool **0.6.0**, loaded and running.
- The installed UI reports **Connected** with the user's companion. The title menu has two entries and the item book entry is visible in the companion view. Five changed code and style files returned HTTP 200 with SHA-256 identical to the tested files.
- In the installed app, the previous CORS image read of the companion's pixel URL still fails, while the shipped dungeon module loads both the pixel and original portrait. The discovered Dream Forest preview opened with `art=ready`, the companion's pixel silhouette and the entry button visible; it was closed without entering, so no walk charge was spent and no AI was called.
- Game, art, chat, walk story and personality-draft values and ETags matched before installation and after the checks. Review **0.8.1 pending_review** and the listing text fields were preserved; `apps push` again re-issued the five screenshot CDN URLs with byte-identical images. No review submission or public release.
