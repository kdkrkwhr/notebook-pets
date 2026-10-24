# Notebook Pets on Anna · latest handoff

Latest two entries only; older entries are preserved in HANDOFF_HISTORY.md. Current work is source-only and does not change the installed/reviewed version.

---


# Item fitting Windows preflight - 2026-10-24

Separate Windows checkout of **6e73f11**. The user approved the fitting-only `image.edit` declaration and subsequent verified activation/deployment/review, bounded to **4 x 1 image / 0 text**, no additional payment, auto-recharge or automatic paid retries. The source manifest now declares `image.edit`; both UI/tool fitting gates remain **false**. Source versions stay **1.4.16 / 0.9.7**; this is a source-only follow-up with no Anna deployment. Both GitHub workflows were checked: they test/build only and do not deploy Anna or change platform grants. Original checkout and its untracked `web/` are preserved.

Windows checks passed: **234 Python with real local stdio MCP / 6 engine / 106 JS / 79 storage-protocol / 138 headless Chromium UI**, Pyodide, strict manifest validation, locked Windows Executa build/binary smoke, dependency compatibility and diff whitespace. Browser requests are locally routed with mock SDK; no existing browser session or live AI is used. Sandbox process/network failures were resolved for these independent local checks; the stopped CUA user-browser operation was not retried. [Evidence and archive hash](releases/EQUIPMENT_PREFLIGHT_20261024.md).

Read-only existing CLI confirms **@kdkrkwhr/notebuddy / app450 / working revision92 / bundle ready / clean vs latest cut**, public **1.4.13/1446**, review **1.4.16/1587 pending**, owner image grant **allowEdit true / edit max1** and deployed manifest still generate-only. Anna-side writes, paid calls, new credentials and grant/security changes: **0**.

**Deployment blocked:** successful edits consume allowance and failed edits do not, per the re-read October23 official answer. This account's included/prepaid balance, exact edit price, overage and auto-recharge behavior remain unverified. Pricing returns401; available CLI has no billing read command. Further exploration stopped. Real image quality/multi-window validation, feature activation, new versions, installation and release review cannot proceed until existing-funds-only use is established. Approval of the task itself is already present.

---

# Gated item fitting source · 2026-10-24

Source-only implementation on Anna `release`, based on **a9b6843**. No Anna deployment, production-data changes, live image calls, new credential/permission grant, public-web publish or review submission. Installed app/tool versions are not changed by this work. Both UI and tool fitting flags remain **false**; the app manifest continues to permit only image.generate.

The transaction reserves without consuming, stages and preserves the result, then atomically commits portrait pointer + one-item consumption + discovery history + receipt. Reconnect/save recovery does not generate another image. Explicit preview/application and pending cancellation are included; no unequip/refund rules were introduced. The existing ownership-based regional reward rule is unchanged.

Local checks: **234 Python / 6 engine / 106 JS / 79 storage-protocol / 138 browser**, strict validation, Pyodide and locked Linux Executa build/smoke passed. Focused browser recheck passed **3/3**. Exact remote SHA/CI are reported in the task result. See [verification](releases/EQUIPMENT_20261024.md) and [API/design/release conditions](docs/EQUIPMENT.md).

Remaining: actual image quality, catalog-art matching, anatomy fit, deployed API/grant and cross-window platform validation. The confirmed single-image edit contract does not establish multi-image composition support. Unseen provider results cannot be recovered without provider support; automatic paid retries remain blocked. Explicit activation/versioning/deployment requires a later authorized step.
