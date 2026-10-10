# Explicit new companion after removal — 0.3.1

The user reported the ended-game screen and approved creating a new random companion after removal. The old game, chat and artwork are not restored. The deployed 0.2.1 explicitly rejects reset of removal markers; this explains the observed behavior.

The ended-game screen now offers Start over with a new companion. It opens the name, close-other-windows and RESET NOTEBUDDY confirmation. The tool conditionally replaces the current removal marker with one pending reset. Repeated requests preserve the same pet. Play remains blocked while chat/art markers and remaining portraits are cleared. Cleanup can resume after interruption, including reopening.

Removal discarded the old sequence high-water mark. A random per-game action namespace (`nb3`) therefore separates restarted companions from every older action. Format-3 saves force older adapters to reject this state. Active resets preserve the namespace and advance sequence; another removal/restart gets another namespace. This protects game actions; it does not promise global cancellation of legacy chat/image requests. Close all old windows and stop pending uploads before confirming.

Cleanup may replace app removal markers only while the tool confirms the exact pending reset originated from removal, using the app row ETag. Ordinary active resets still reject unexpected removal markers. No normal start/action automatically removes a tombstone.

Release boundary: app 0.3.1 and tool 0.1.11 must be deployed together. Current Anna 0.2.1 remains installed/pending review; the previous upload was rejected by Anna WAF on portrait-features.mjs. This change does not bypass that filter or alter the user's live records. The new button is unavailable in the old installed app until a supported deployment succeeds.

Validation: strict manifest validation, 41 UI unit tests, 50 Python storage/protocol tests and 63 browser scenarios passed locally. Coverage includes confirmed restart from all three removal markers, cancel, interrupted cleanup/reopen, namespace-preserving active reset, expired pre-removal requests, reply-loss idempotency and conditional-write conflicts. This is local/fault-injected verification, not deployment or a live-account reset.
