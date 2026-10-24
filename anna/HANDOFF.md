# Notebook Pets on Anna · latest handoff

Latest two entries only; older entries are preserved in HANDOFF_HISTORY.md. Current work is source-only and does not change the installed/reviewed version.

---

# Gated item fitting source · 2026-10-24

Source-only implementation on Anna `release`, based on **a9b6843**. No Anna deployment, production-data changes, live image calls, new credential/permission grant, public-web publish or review submission. Installed app/tool versions are not changed by this work. Both UI and tool fitting flags remain **false**; the app manifest continues to permit only image.generate.

The transaction reserves without consuming, stages and preserves the result, then atomically commits portrait pointer + one-item consumption + discovery history + receipt. Reconnect/save recovery does not generate another image. Explicit preview/application and pending cancellation are included; no unequip/refund rules were introduced. The existing ownership-based regional reward rule is unchanged.

Local checks: **234 Python / 6 engine / 106 JS / 79 storage-protocol / 138 browser**, strict validation, Pyodide and locked Linux Executa build/smoke passed. Focused browser recheck passed **3/3**. Exact remote SHA/CI are reported in the task result. See [verification](releases/EQUIPMENT_20261024.md) and [API/design/release conditions](docs/EQUIPMENT.md).

Remaining: actual image quality, catalog-art matching, anatomy fit, deployed API/grant and cross-window platform validation. The confirmed single-image edit contract does not establish multi-image composition support. Unseen provider results cannot be recovered without provider support; automatic paid retries remain blocked. Explicit activation/versioning/deployment requires a later authorized step.

---

# Anna 1.4.16 storage declaration fix — 2026-10-23

Runtime source **daa3014**. The reported server error was reproduced: the tool's cached runtime manifest declared only `aps.kv`, while the app also required files and tool read/write access. Tool **0.9.7** declares all four capabilities in distribution metadata and its runtime `describe`, without a separate tool `storage` field. App permissions, UI source, gameplay, save format and AI behavior are unchanged. Full-manifest protocol and packaged-binary smoke assertions prevent an incomplete declaration from passing validation.

[Anna CI 39711760114](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39711760114) passed Windows and Linux: each **135 browser / 96 JS / 76 storage-protocol**, strict validation and standalone build/smoke. [Shared CI 39711760205](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39711760205) passed. Full local Windows checks passed the same counts plus binary smoke. Initial local generated-engine staleness was resolved by `prepare:assets` and a full passing rerun; the first Windows CI attempt timed out after slow tooling setup, and the rerun passed. Both tested platform packages are published and their CDN bytes/metadata hashes match the tested archives; exact hashes are in **releases/RELEASE_1416.md**.

Installed owner app **1.4.16 / revision 92 / 0.0.0-draft**, actual cloud tool **0.9.7 / immutable Executa 818 / master 1193 / user executable 35689 loaded/running**. Final install status is **success / Already loaded**. An initial stale executable-path error was resolved by reinstalling only this tool and reopening the draft. The cloud agent resumed on the following day's refresh and still runs 0.9.7. UI is connected with no notice; the existing portrait and two chat messages load, home sprite is ready, and installed **app.js / mobile.css / data.mjs / home-sprite.mjs / anna-tool-ids.js** hashes match the local bundle. All five owner APS documents (game, art, chat, walk story, personality draft) retain identical values and ETags. Paid AI calls: **0 text / 0 images**.

Fresh user authorization covers **1.4.16**, since immutable 1.4.15 cannot be overwritten. Cut **1.4.16 / ID 1587** freezes tool **0.9.7 / Executa 818**, bundle **1472 / 175 files / 171604935 bytes**, manifest SHA-256 **83c7c16b6be79de692bdb8608d3eb57a0af446dcaf0bfd4c3cd3669f237cba8a**. Working hash **c6ed85cf2c262e4f340f1b4610f1c1c42058c758c8b5be3c22cf4727957e6fcf**, **dirty_vs_latest_cut false**, minimum/exact tool **0.9.7**. The release request returned **pending / is_latest false / published_at null**; old **1.4.15 / 1486** is **superseded**. Developer Console confirms **1.4.16 in release review**. Public **1.4.13 / 1446**, its complete immutable row, listing and six screenshots remain unchanged; no public web deployment.

Server manifest validation passed after installation, overnight and for frozen 1.4.16 after submission, with **valid true / errors []** and all four cached capabilities retained. Approval/publication, physical mobile/native-shell behavior and new provider-quality testing are not claimed. Private evidence: **.local/storage-fix-{cut-result,submission,final,ui-final,validation-binaries,validation-latest}.json** and test/build logs; do not commit these owner-data snapshots. See **releases/RELEASE_1416.md** and **reviews/REVIEW_1416.md**.
