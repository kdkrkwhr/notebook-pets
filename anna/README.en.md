# Notebuddy · Anna edition

[한국어](README.md) · **English**

One companion. A little care, every day. This private Anna app reuses the original Notebook Pets Python engine with an English-first interface and an optional Korean interface. The review candidate is app **0.3.4**, game tool **0.1.15**, with status **pending_review**. On 2026-10-12, its listing and privacy link were updated and review was requested again. See the [submission record](RELEASE_034.md); approval and publication are still pending.

## Test app: connected dungeon rooms

Installed test app **0.5.0 / tool 0.3.0** includes Hellgate, Ice Kingdom and Dream Forest. Walks can discover one unfinished dungeon at a time, open for 24 hours. Entry costs one walk charge for a 3–6 room expedition. Meet different enemies, carry HP between rooms, recover at sanctuaries in longer layouts, and clear the final guardian for 10 coins per region per Korea calendar day. Movement follows the visible corridors and gates. Pause, 3x playback, skip and saved replay do not change rewards.

Four-direction animated pixel avatars use species anatomy and portrait colors, without an additional AI call. They simplify the original appearance and do not reproduce every custom detail. Original portraits and stored 64×64 images are preserved. Existing single-boss expeditions remain replayable as one room; new entries use multiple rooms. See [rules](DUNGEONS.md) and the [verified deployment record](RELEASE_050.md). The public review candidate remains 0.3.4.

## Walk stories

Some peaceful walks open a short AI episode with two choices. One request generates both endings; selection adds no AI usage, XP or items. Finish the current episode before another walk. Reopening restores the latest choice without generating again. AI failure uses a prepared story. Stories are part of reset/removal. New stories use Anna allowance.

## Create from a drawing or photo

Choose a random companion or **From a drawing or photo**. Draw on the canvas or select a PNG, JPEG or WebP file (up to 12 MiB and 16 megapixels, at least 32 pixels per side). Your device resizes the longest side to at most 1024 pixels and re-encodes the image as PNG without original metadata. Selection and preview do not call AI. See the [work and deployment record](RELEASE_035.md). **Meet** starts an AI image check that infers species from body shape and element from visible colors or motifs, followed by baby portrait generation. Only the element is random when cues are absent; uncertain species interpretations require confirmation. Original silhouette, limb count, face and markings take priority over generic anatomy, including later redraws and growth portraits. Both steps use Anna allowance. A failed generation can be retried for the same companion.

## Languages and saved progress

Choose English or 한국어 in the header. The preference is remembered in this browser; when browser storage is unavailable, it lasts only for the current window. English is the default on a fresh visit.

The selected language applies to game outcomes, quests, growth stages, errors, accessibility labels and new AI replies. Names and existing conversations remain unchanged. Daily activities always reset at midnight Korea time (UTC+9), regardless of language.

Localization happens after the original engine commits an action. Changing language does not alter game saves, inventory or request receipts. Retrying the same request in another language does not award it again. Direct tool calls accept `language: "en" | "ko"` (default `en`).

## Start over

Choose **Start over**, confirm `RESET NOTEBUDDY`, then choose a name and a random companion or a drawing/photo on the first-meeting screen. This replaces the pet and clears progress, chat and portraits. Random starts redraw both traits; reference starts infer them from the drawing or photo. Close other windows and stop pending requests first. Interrupted cleanup can resume; no AI portrait is generated automatically. **Remove my saved data** permanently deletes the existing records. After removal, an explicit confirmed start-over can create a new companion; deleted records cannot be restored.

## Battles and growth

Care results appear below the action buttons. Ordinary AI chat remains available. Successful care triggers an AI reaction using Anna allowance. Failed replies never undo committed care.

Walking encounters show opponent artwork. A short 2D scene replays the server's committed battle turns, with HP bars, skip and reduced-motion support. The animation cannot award extra rewards or change the result.

Growth stages begin at **levels 1 / 10 / 30 / 50**, with the existing level-100 cap and XP costs. Existing saves retain identity, XP, portraits and history when adopting the new milestones. Drawing a new personal portrait remains an explicit action.

## Development

Requires Node.js, Python 3.11+ and uv. Run from `anna/`:

```powershell
npm ci
npm run prepare:assets
uv sync --locked --project executas/notebuddy
npx anna-app login --host https://anna.partners
npx anna-app executa register --tool-id tool-dev-notebuddy
npx anna-app executa register --tool-id dev-notebuddy-dev
npm run dev:live
```

Open http://localhost:5180/. Live development uses real Anna storage and AI allowance. Development and installed-app storage are separate.

```powershell
npm run validate
npm test
npm run test:plugin
```

The Anna CI workflow validates the app, runs UI, browser and Python regression tests, and builds and smoke-tests Windows/Linux packages without calling paid AI services.

## Bounded game saves and retries

New actions append a unique suffix to `request_id_prefix` from the latest status/action response. Reuse the entire ID after a timeout. At most 64 outcomes / 24 KiB of receipts are retained; the entire game document is guarded at 48 KiB. Forgotten requests are rejected using the persistent sequence, never executed as fresh actions. The next accepted new action migrates legacy saves without changing the partner; older tool versions cannot write the new envelope. See [STORAGE_POLICY.md](STORAGE_POLICY.md) for the exact contract and rollback restrictions.

## First-partner creation

Before the first write, the adapter rechecks whether another agent already created a partner while the engine was computing. This preserves that partner and its progress when observed. The final read/write gap remains: APS has no supported atomic create-if-absent operation. Cross-agent first creation remains a release blocker pending Anna support. See [FIRST_CREATION.md](FIRST_CREATION.md) for the API evidence, offline reproducer, and closure criteria.

## Structure

| File | Responsibility |
| --- | --- |
| `bundle/i18n.mjs` | English/Korean UI catalog, preference and reply-language prompt |
| `bundle/app.js` | Anna UI, chat, care and portrait storage |
| `executas/notebuddy/localization.py` | Localized presentation of committed game results |
| `executas/notebuddy/notebuddy_plugin.py` | Authenticated APS storage and Executa protocol |
| `executas/notebuddy/game_worker.py` | Original game engine in an isolated temporary store |

See [HANDOFF.md](HANDOFF.md) for deployment evidence and remaining release checks. The app is a private draft, not a public store release.

## Start over

Confirm **Start over** with the checkbox and `RESET NOTEBUDDY`. After clearing the old companion, chat and portraits, the app returns to the first-meeting screen. Choose a name and Random or Drawing there. Reset alone does not create a companion or call image generation. Interrupted cleanup can resume; deleted records cannot be recovered.
