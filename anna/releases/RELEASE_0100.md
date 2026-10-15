# 0.10.0 · JRPG notebook theme

App **0.10.0**, unchanged game tool **0.6.0**. Phase 1 of the UI/UX overhaul: a warm notebook palette with JRPG-style windows, a title screen, a new-companion step indicator and a tabbed collection. Owner test deployment was verified on **2026-10-14 KST**. The shared listing and pending **0.8.1** review remain the review materials.

## Behavior

- **Theme.** Squared-paper background, framed windows with a gold heading marker, chunky press-down buttons, a ▶ cursor on care actions, story choices and menus, segmented progress bars and pixel-bordered chat bubbles. Headings, buttons and labels use the bundled pixel font **Galmuri11** (SIL OFL 1.1, see `THIRD_PARTY_NOTICES.txt`); long text stays in the system font. Portraits keep the original illustration; the pixel version is still used only in dungeons.
- **Title screen.** Shown on every load as a modal window with four starter stickers, the logo and a Start / Item book / Privacy menu. Arrow keys move, Enter or Space selects, any other key, Escape or a click outside closes it. It never waits for or blocks the connection; startup busy states do not disable its buttons.
- **New-companion steps.** The welcome form shows *Choose a start → Name → Meet* and follows the actual form state (art mode needs a reviewed picture before the name step).
- **Collection.** The item book now has **Items** and **Growth album** tabs (click or Left/Right keys). The album tab mirrors saved growth portraits and explains itself when empty. The item book is still a read-only preview.
- No game, storage, AI or tool behavior changed.

## Verification

- JavaScript **79**, browser **89**, plugin **65** and strict manifest validation passed locally. New browser checks cover the title on every reload, menu keyboard handling, the title leading to the collection without blocking the connection, welcome steps tracking the form and the empty album state.
- Desktop and mobile layouts (title, home, items, album, welcome) were captured in isolated views and visually inspected with no page errors.
- Source **1d4f8bc6e5cf28495132292eb6e70d2fdf72c8c4** passed both Windows/Linux jobs of [Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38524895972) and the [engine workflow](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38524895752). The unchanged tool was not republished.

## Owner deployment

- `apps push` produced working revision **46** with **143** ready bundle files and no upload block. `apps cut 0.10.0` created immutable version ID **1380**, froze Executa version **746 (0.6.0)** and reused both cached binaries. Installed to the owner as **0.0.0-draft** using the official working-install endpoint (`already_satisfied`, tool already loaded).
- The actual agent reports tool **0.6.0**, loaded and running.
- After reopening the app, the installed UI reports **Connected** with no notice. The title screen was open with enabled menu buttons and both Galmuri11 faces loaded. Start closed it and showed the welcome steps; the item book listed **16** items and the Growth album tab showed its empty-state text. Captures of the installed title and album tab were inspected.
- Nine code, style and font files returned HTTP 200 with SHA-256 identical to the tested local files; the fonts are served as `font/woff2`. `index.html` cannot be fetched directly without the frame's access token (403), so its content was confirmed through the rendered DOM.
- The account was at the new-companion welcome screen. Verification did not create a companion, spend a walk charge or call AI. Game, art, chat, walk story and personality-draft values and ETags matched before installation and after the UI checks.
- Review **0.8.1 pending_review** and the listing text fields were preserved. `apps push` re-issued the five screenshot CDN URLs; the downloaded images are byte-identical and in the same order as before. No review submission or public release.

## Remaining

- Phase 2 ideas (not started): pixel-style dialogue boxes for walk stories, a tabbed home menu and richer title art. Item ownership, pricing and fitting remain unimplemented as in 0.9.0.
