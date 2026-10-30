# Anna development and deployment

[Back to the user guide](README.en.md) · [한국어](DEVELOPMENT.md)

Owner test app **1.4.16 / working revision 92 / game tool 0.9.7** is verified. Review candidate **1.4.16 / ID 1587 / pending** fixes storage declaration drift and retains the mobile layouts and five languages from 1.4.15, which is now superseded. Public Anna **1.4.13** remains live; web unchanged. [Latest handoff](HANDOFF.md) · [Release record](releases/RELEASE_1416.md).

For a published app, a new unapproved cut enters per-version release review through `apps release <version>`. This submission returned `release_review_state: pending`, `is_latest: false`, `published_at: null`; the existing public version stayed current. The initial-listing `submit-review` route rejects published apps. Do not unpublish the app to bypass it. Releasing an already-approved version can go live immediately, so inspect its state and distinguish review authorization from immediate publication. [Operator explanation](https://forum.anna.partners/t/is-review-now-required-for-every-new-app-version-i-couldn-t-find-this-change-in-the-changelog/224).

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

The development launcher forces UTF-8 for the Python bridge JSON streams, preventing Windows CP949 corruption and storage failures with Korean text. Use isolated development storage and a request cap for paid tests. See the [2026-10-17 paid test record](docs/PAID_TEST_20261017.md) (Korean).

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

New actions append a unique suffix to `request_id_prefix` from the latest status/action response. Reuse the entire ID after a timeout. At most 64 outcomes / 24 KiB of receipts are retained; the entire game document is guarded at 48 KiB. Forgotten requests are rejected using the persistent sequence, never executed as fresh actions. The next accepted new action migrates legacy saves without changing the partner; older tool versions cannot write the new envelope. See [STORAGE_POLICY.md](docs/STORAGE_POLICY.md) for the exact contract and rollback restrictions.

## First-partner creation

Before the first write, the adapter rechecks whether another agent already created a partner while the engine was computing. This preserves that partner and its progress when observed. The final read/write gap remains: APS has no supported atomic create-if-absent operation. The owner accepted this limitation for review submission; platform support remains a follow-up. See [FIRST_CREATION.md](docs/FIRST_CREATION.md) for the API evidence, offline reproducer, and closure criteria.

## Anna mobile container

`manifest.json` declares `ui.form_factors: ["desktop", "mobile"]`, shares `index.html` and permits a 320px minimum view width. The Anna shell injects viewport metadata; do not add a second viewport meta to the bundle. Test hosts and future standalone adapters must provide their own appropriate container viewport.

`bundle/mobile.css` handles both `env(safe-area-inset-*)` and `--anna-safe-area-*`. Mobile controls and explanation triggers use at least 44×44 CSS pixels. Help opens/closes on tap, evolution actions and collection headers remain reachable while scrolling, and short landscape home views place the shop beside the world. No game-rule or paid-AI changes are introduced.

Run `node --test tests/browser/mobile.browser.mjs` for touch-enabled Chromium coverage: 320px layouts in all five locales, synthetic safe areas, rotation and reduced-height keyboard space. Requests are isolated and no paid provider is used. This is not physical iOS/Android, OS keyboard or hardware-back verification. See [Anna mobile requirements](https://anna.partners/developers/apps/app-mobile.md).

## Structure

| File | Responsibility |
| --- | --- |
| `bundle/i18n.mjs` | English/Korean UI catalog, preference and reply-language prompt |
| `bundle/app.js` | Anna UI, chat, care and portrait storage |
| `executas/notebuddy/localization.py` | Localized presentation of committed game results |
| `executas/notebuddy/notebuddy_plugin.py` | Authenticated APS storage and Executa protocol |
| `executas/notebuddy/game_worker.py` | Original game engine in an isolated temporary store |

See [HANDOFF.md](HANDOFF.md) for deployment evidence and remaining release checks. The app is a private draft, not a public store release.
