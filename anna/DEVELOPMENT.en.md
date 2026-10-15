# Anna development and deployment

[Back to the user guide](README.en.md) · [한국어](DEVELOPMENT.md)

The current owner test app is **1.1.2**, with game tool **0.7.0**. The review candidate is **1.0.0**. See the [latest deployment record](releases/RELEASE_112.md).

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
npm run test:browser
npm run test:plugin
```

`test:plugin` uses the same `unittest` runner as CI. Root engine tests run from the repository root with `python -B -X utf8 -m unittest discover -s tests -p "test_*.py"`; pytest runs the same tests.

The Anna CI workflow validates the app, runs UI, browser and Python regression tests, and builds and smoke-tests Windows/Linux packages without calling paid AI services.

## Bounded game saves and retries

New actions append a unique suffix to `request_id_prefix` from the latest status/action response. Reuse the entire ID after a timeout. At most 64 outcomes / 24 KiB of receipts are retained; the entire game document is guarded at 48 KiB. Forgotten requests are rejected using the persistent sequence, never executed as fresh actions. The next accepted new action migrates legacy saves without changing the partner; older tool versions cannot write the new envelope. See [STORAGE_POLICY.md](STORAGE_POLICY.md) for the exact contract and rollback restrictions.

## First-partner creation

Before the first write, the adapter rechecks whether another agent already created a partner while the engine was computing. This preserves that partner and its progress when observed. The final read/write gap remains: APS has no supported atomic create-if-absent operation. The owner accepted this limitation for review submission; platform support remains a follow-up. See [FIRST_CREATION.md](FIRST_CREATION.md) for the API evidence, offline reproducer, and closure criteria.

## Structure

| File | Responsibility |
| --- | --- |
| `bundle/i18n.mjs` | English/Korean UI catalog, preference and reply-language prompt |
| `bundle/app.js` | Anna UI, chat, care and portrait storage |
| `executas/notebuddy/localization.py` | Localized presentation of committed game results |
| `executas/notebuddy/notebuddy_plugin.py` | Authenticated APS storage and Executa protocol |
| `executas/notebuddy/game_worker.py` | Original game engine in an isolated temporary store |

See [HANDOFF.md](HANDOFF.md) for deployment evidence and remaining release checks. The app is a private draft, not a public store release.
