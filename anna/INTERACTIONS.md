# Companion interactions — Anna 0.2.0 / tool 0.1.9

## Behavior

- Care actions commit through the existing sequenced request/ETag mechanism before chat reactions. Basic responses are labelled; optional AI reactions are off by default and use Anna allowance. Only one automatic AI request is in flight per window. Replayed server receipts never request another AI reply.
- Activity/reaction pairs use stable request-derived IDs and share the existing 24-entry chat window. Failed saves remain in memory, survive app Refresh and can be retried without AI. Full reload loses unsaved entries. The platform's existing first-row atomic-create limitation still applies.
- Battles expose the opponent and at most 20 authoritative turns. The UI replays these locally; skipping, closing or reduced-motion mode never changes rewards. Opponents use bundled species/element artwork without image generation. No capturing or extra companions.
- Stage thresholds are level 1/10/30/50; max level stays 100. XP costs remain 100 at levels 1–30, 200 at 31–50, 400 at 51–80 and 800 at 81–99. Image generation remains explicit.

## Save compatibility

The engine validates versions 2/3 against their original stage boundaries before migrating in memory to version 4. Read-only calls do not write. The next mutation atomically persists the migrated state with its receipt. Pet identity, XP, inventory, prior history and image keys remain stable. Newly crossed milestones are marked `reason: progression_update` at migration time, not backdated. A newly reached final stage chooses the existing intimacy-based light/dark branch. Already-final branches are retained.

Do not restore an old engine against a version-4 save: old engines reject it. Roll forward or use an explicitly verified backup migration; downgrading a version number is not a rollback. Existing private launch blockers, including concurrent first-ever creation, remain unchanged.

## Offline progression check

Actual engine handlers, 9 species × 3 fixed seeds per routine, no real save access and no battles in the compared routines:

| Routine | Lv10 | Lv30 | Lv50 |
| --- | ---: | ---: | ---: |
| Active care | Day 3 | Day 7 | Day 16 |
| Daily-quest routine | Day 5 | Day 15 | Day 34 |
| Light care | Day 9 | Day 28 | Day 65 |

These are simulated daily schedules, not measured user retention or guaranteed play time. Reproduce with `python -B -X utf8 tools/simulate_balance.py --trials 5 --output output/companion-balance.json`; the report includes exact routines and seeds.

## Verification

Regression coverage includes legacy migration and invalid-save preservation, battle HP conservation and exactly-once rewards, adapter replay flags, disabled/failed/in-flight AI reactions, storage-only retries, and isolated browser tests for encounters, battle skip, reduced motion and 360px layout. The browser suite mocks Anna services and makes no paid AI calls. Live platform smoke checks and CI results are recorded separately in the release verification notes.
