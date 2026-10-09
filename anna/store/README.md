# Store screenshots

Captured on 2026-10-09 from app 0.1.11 with the actual bundled UI and Python game engine, using an isolated local Anna development harness. The harness controls and logs are excluded. Screenshots contain no real account data, fabricated AI conversation, edited game values or generated UI mockups.

- `01-first-meeting.png`: actual initial screen, 1280 × 820.
- `02-companion-and-care.png`: a newly created test companion, 1280 × 1520.
- `03-care-and-album.png`: the same companion's care, daily quests and locked future stages, 1280 × 740.

The companion uses the revised `starters-v1` artwork. The 0.1.11 recapture verified image decoding and initial creation; the language/privacy checks below refer to the earlier capture, with current behavior also covered by the browser regression suite. No paid AI request was made. The English UI, Korean privacy dialog, closing behavior and a 360-pixel privacy-dialog layout were checked in a separate headless Edge browser. This is not a native-mobile certification or an APS persistence test.

The CLI legacy in-memory harness did not retain the sequenced game state across the start → feed calls in an earlier capture attempt: feed returned `request_expired`. That failed capture was discarded. Final screenshots show the successful initial creation only. Real APS save/persistence checks belong to the installed private Anna app and are recorded in `../HANDOFF.md`; do not use the legacy harness to certify them.

`../app.json` references these local files. Anna CLI uploads them through the official listing screenshot API. Recheck screenshots against the frozen release candidate before review submission. No cover asset has been invented; the cover remains optional and unset.
