# Notebuddy · Anna edition

[한국어](README.md) · **English**

One companion. A little care, every day. This private Anna app reuses the original Notebook Pets Python engine with an English-first interface and an optional Korean interface. Installed private version: app **0.2.1**, game tool **0.1.9**. Startup recovery and the new growth milestones have been verified in the installed app. See [deployment status](HANDOFF.md).

## Languages and saved progress

Choose English or 한국어 in the header. The preference is remembered in this browser; when browser storage is unavailable, it lasts only for the current window. English is the default on a fresh visit.

The selected language applies to game outcomes, quests, growth stages, errors, accessibility labels and new AI replies. Names and existing conversations remain unchanged. Daily activities always reset at midnight Korea time (UTC+9), regardless of language.

Localization happens after the original engine commits an action. Changing language does not alter game saves, inventory or request receipts. Retrying the same request in another language does not award it again. Direct tool calls accept `language: "en" | "ko"` (default `en`).

## Start over

Choose **Privacy & data → Start over with a new companion**, enter a new name and confirm `RESET NOTEBUDDY`. This replaces the pet and clears progress, chat and portraits. Species and element are both randomly redrawn and may coincidentally match. Close other windows and stop pending requests first. Interrupted cleanup can resume; no AI portrait is generated automatically. **Remove my saved data** remains separate permanent removal, with no restart afterward.

## Battles and growth

Care results appear below the action buttons. Ordinary AI chat remains available. This version does not include automatic AI reactions to care actions.

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

## Next update: evolution portraits

The develop version bundles only 72 baby pictures. Evolution automatically generates a new portrait using the previous saved appearance as a reference (the matching baby picture if no prior portrait exists). It uses Anna image allowance and shows a growing/saving effect. Failures preserve game progress and the old appearance. The submitted 0.2.1 candidate is unchanged.

## First meeting from your artwork (develop)

Random mode uses the existing 72 baby pictures. Artwork mode accepts an uploaded image or a simple drawing, checks it with AI, then creates a baby that combines its visual features with the server-selected random species and element. Checking and generation use Anna allowance. Empty, unsupported, unclear and refused inputs have distinct guidance from model, generation and saving failures. Retrying keeps the same companion; saving a received portrait never generates it again. You can explicitly keep the default appearance instead.

If the first reference save failed before closing the app, the baby album offers artwork setup again. The normalized reference and a short visual description are retained in Anna storage and covered by reset/removal cleanup. See [artwork behavior and verification](USER_ARTWORK.md). Real reference generation remains blocked by the [observed provider route error](EVOLUTION_LIVE_VERIFICATION.md); the review candidate has not been replaced.
