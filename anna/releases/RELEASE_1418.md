# Anna 1.4.18 — home life and our memory notebook

Deployed app **1.4.18**, tool **0.9.9**, runtime source **24bf364**. Owner installation: **0.0.0-draft / working revision94 / ready**. Public Anna remains **1.4.17 /1640**, approved/latest; no new review candidate was cut or submitted.

## Behavior

- Placed nest, bookcase and plant receive reachable, personality-influenced visits with five-language activity captions. Existing directional sheets and free default appearances are reused. Watching never calls AI, moves furniture or changes rewards/saves.
- Our memory notebook shows evidenced meeting/evolution milestones and first recorded regional guardian victories. Records survive rolling activity history and are committed with the actual game action; replay does not duplicate them. Earlier dates and victories are not invented from cumulative progress.
- Users explicitly save completed conversation messages, retaining original text independently of rolling chat. Up to20 saved messages,3,000 characters each and40,000 UTF-8 bytes per notebook. Removal affects only the saved copy. Conditional saves, same-message retry, pet fencing, reset and erasure follow the existing APS lifecycle.
- No new text/image AI calls, paid retries, permissions or backend services.

## Validation

[Final Anna CI41006544330](https://github.com/kdkrkwhr/notebook-pets/actions/runs/41006544330), exact24bf364: Windows and Linux each passed **119 JS,147 browser and80 storage/protocol tests**, strict manifest validation, binary build and actual standalone smoke. Packaged tests cover meeting/evolution/guardian milestones and duplicate replay. [Shared CI41006067291](https://github.com/kdkrkwhr/notebook-pets/actions/runs/41006067291) passed Python, real stdio MCP, engine checks and browser Pyodide at4d8fa06, whose Python sources are identical to24bf364. Local checks passed247 core,6 engine and80 storage tests, plus CLI sdist/wheel and isolated MCP checks.

Independent review found that Anna returns a missing APS row as `{exists:false,value:null}`. The shared storage boundary now normalizes only explicit absence, retains existing-null errors and rejects missing ETags for existing values. Tests cover actual absent-null load/save/reset/erase,20-entry/character/byte limits, two-writer conflicts, lost replies, pet/reset fences, reload, keyboard focus, five locales,320/390px and zero AI calls. A second review accepted the correction. Initial JS failures from ETag-free home-sprite fixtures were corrected to the real CAS contract before the final green CI.

The long local browser run finished at **144/147**; its three failures exposed short fixed-delay observations of pending replies and birth images. Test-only completion gates now hold those operations until each test has observed the intended state. The final focused reaction suite passed **6/6**, and the birth/replacement/retry/reset suite passed **5/5**. The full local browser suite was not rerun. These changes do not alter the deployed runtime or packages, which passed all 147 browser checks on both CI platforms. Initial pre-asset/RED-stage worktree runs are also retained as failures in ignored logs.

## Deployment evidence

- Tool master1193, immutable version928, user executable35689; both PC and cloud report installed/loaded/running **0.9.9**. The normal owner install selected the cloud agent, then observed online. No separate cloud-resume/default-agent change was sent. The PC was updated via the official single-tool `plugins/reinstall` request, with no preceding uninstall or unrelated tool update.
- Working hash `30552cec12e4ec90aeb341c76ddf019c0425015cbbd390b175759e7186ac9fb5`;179 files /171661114 bytes. Eleven hosted UI files match local raw bytes, including notebook, home and shared storage modules. Hashing raw response bytes preserves the existing CSS BOM.
- Windows archive SHA-256: `082b6a9ba3bad4bff6205ec94dd50e429d631b043198a3c093186d8a147a3738`.
- Linux archive SHA-256: `5073d7b10c5fef7f895ca42d4b85b5cbc4498fc46bbfe256ba492e9b4890dd9a`.
- Shared listing hash remains `d7991d244b02a9e7007abb2fb0529d9b77aa42f3b36e79ebb9d218c132f4923b`. The push wrapper permits working-draft/bundle writes only and blocked the CLI's automatic screenshot/listing synchronization.
- Game, artwork, chat, walk-story and personality-draft values/ETags remain identical. The new memory record is still absent; deployment did not manufacture personal history or saved words. Review/public version and screenshot URLs are unchanged.

## Shared Web delivery

Merged through Git into `release-web`, **Web0.8.0 / bd7592b**. [Pages41007524755](https://github.com/kdkrkwhr/notebook-pets/actions/runs/41007524755) passed build/deploy. All Web regressions passed: local AI adapters, core/CAS/backup/reset, home, current UI, memories, evolution, themes, architecture and wiki. Existing IndexedDB game/art/chat data is preserved; memories use revision+epoch+pet guards and validated backup/import. Unsupported Web fitting remains disabled.

On the [live site](https://kdkrkwhr.github.io/notebook-pets/), changed JS hashes match the verified build. Isolated browser checks exercised actual Pyodide creation, one first-meeting milestone, notebook, reload and320/390/1280px without horizontal overflow; page errors and external AI requests were zero. Existing user browser data was not accessed.

## Limits

No native Anna visual, physical iOS/Android or screen-reader claim. Local browser visuals and actual hosted bytes/running tools were checked separately. Initial APS creation has the pre-existing non-atomic creation limitation. Unknown earlier dates/victories remain unknown. See [home life](../docs/HOME_LIFE.md) and [memory notebook](../docs/MEMORY_NOTEBOOK.md).
