# Notebuddy · Anna edition

[한국어](README.md) · **English**

One companion. A little care, every day. This private Anna app reuses the original Notebook Pets Python engine with an English-first interface and an optional Korean interface. App version **0.1.2**, game tool **0.1.3**.

## Languages and saved progress

Choose English or 한국어 in the header. The preference is remembered in this browser; when browser storage is unavailable, it lasts only for the current window. English is the default on a fresh visit.

The selected language applies to game outcomes, quests, growth stages, errors, accessibility labels and new AI replies. Names and existing conversations remain unchanged. Daily activities always reset at midnight Korea time (UTC+9), regardless of language.

Localization happens after the original engine commits an action. Changing language does not alter game saves, inventory or request receipts. Retrying the same request in another language does not award it again. Direct tool calls accept `language: "en" | "ko"` (default `en`).

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

The Anna CI workflow validates the app, runs 10 UI tests and 17 Python tests, and builds and smoke-tests Windows/Linux packages without calling paid AI services.

## Structure

| File | Responsibility |
| --- | --- |
| `bundle/i18n.mjs` | English/Korean UI catalog, preference and reply-language prompt |
| `bundle/app.js` | Anna UI, chat, care and portrait storage |
| `executas/notebuddy/localization.py` | Localized presentation of committed game results |
| `executas/notebuddy/notebuddy_plugin.py` | Authenticated APS storage and Executa protocol |
| `executas/notebuddy/game_worker.py` | Original game engine in an isolated temporary store |

See [HANDOFF.md](HANDOFF.md) for deployment evidence and remaining release checks. The app is a private draft, not a public store release.
