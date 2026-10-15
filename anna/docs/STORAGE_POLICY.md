# Anna game storage and retry policy

Implemented in app 0.1.4 / tool 0.1.5. This policy applies to the Anna game adapter, not the original Discord engine or local saves.

## Bounds

| Item | Limit |
| --- | --- |
| Retained action outcomes | At most 64 |
| Serialized receipt map | At most 24 KiB |
| Entire serialized game document | At most 48 KiB |

Sizes use ASCII-escaped JSON with default separators, conservatively counting Unicode and spaces. The [APS reference](https://anna.partners/developers/reference/executa-persistent-storage.md) contains both 64 KiB and 256 KiB descriptions; 48 KiB is our application guard below either figure, not a claim that the service's actual cap has been measured. Account-wide quota and other Anna apps can still cause storage failures.

Before committing, the adapter removes oldest retained outcomes until both count and receipt-byte bounds pass. Ordering is recorded explicitly; APS JSON object key order is not trusted. Legacy receipts have no reliable age, so their retained subset is selected deterministically. The game history, identity, stats, inventory, evolution and daily counters are not pruned. If non-receipt game data or one outcome cannot fit, the action is not saved and the prior state is preserved.

## Why old actions cannot execute again

`status` and action responses return `request_id_prefix`, for example `nb2:12:`. A new action appends a unique suffix: `nb2:12:550e8400-e29b-41d4-a716-446655440000`. The full ID must stay unchanged after a timeout, language change or reconnect.

- A retained ID returns its original outcome. A different command/name with that ID returns `request_conflict`.
- A new ID must use the current sequence. An older, future, unsequenced or noncanonical ID without a retained outcome returns `request_expired`; it is never run as a new action.
- Each accepted terminal outcome (including normal game failures on an existing valid save) advances the sequence. Failures are cached so, for example, retrying a failed meal after receiving food cannot silently become a successful meal.
- The result, next sequence and game state are committed in one APS ETag write. Nothing is acknowledged as saved before that write succeeds.
- If two different actions use the same sequence, one can commit. The loser refreshes on the ETag conflict, observes its stale sequence, and returns the current state without performing the other action. The user chooses a new action explicitly; the UI/agent must not automatically restamp it.
- The current sequence remains after old receipts are removed. Therefore memory stays bounded without allowing forgotten successful requests to execute again. Exact old narration is available only while its receipt remains.

The limit is count/bytes, not a promise of a certain number of days. Valid read-only commands never advance the sequence or rewrite the save. A missing partner, invalid save, input validation error or pre-commit capacity failure also does not claim a committed action.

## Existing saves and old clients

Legacy `notebuddy/game-v1` values remain readable. Known legacy request IDs can replay retained outcomes; unknown legacy IDs cannot start new mutations. Updated UI and tool instructions use the prefix returned by `status`.

The next accepted new action atomically compacts the legacy receipts and stores:

```json
{
  "_anna_save_format": 2,
  "game": {
    "processed_requests": {},
    "_anna_requests": {"version": 1, "next_sequence": 13, "order": []}
  }
}
```

This is a structural example; real `game` contains the original engine state and valid retained receipts. The APS key and authenticated `tool` scope are unchanged. Reads and replays alone do not migrate.

Older adapters feed the envelope directly into the original engine. Its strict validation rejects the envelope without writing, so an old runner cannot bypass the new retry policy after migration. **Do not roll back to tool 0.1.4 or earlier after migration**; upgrade the runner or deploy a forward-compatible fix. Do not strip the envelope or reset the sequence as a recovery shortcut. Malformed/unknown envelope and request metadata fail without overwriting the stored document.

This does not fix a delayed *unconditional first write* that was already in flight before another partner was created. [FIRST_CREATION.md](FIRST_CREATION.md) remains a separate release blocker.

## Validation evidence

- Raw adapter tests cover exact replay, mismatched payloads, cached failures, evicted/legacy/future IDs, two independent agents, lost write responses, offline writes, migration of 2,000 legacy receipts, capacity rejection and old-engine rejection.
- The actual JSON-RPC test covers get → first-write recheck → one enveloped set, then reading the committed sequence and partner.
- A 10,000-outcome policy simulation checks count/byte bounds, explicit ordering despite reordered JSON keys, and rejection of the earliest request. It is an offline policy test, not 10,000 live Anna calls or a gameplay balance simulation.
- UI tests check new ID construction, preservation of pending IDs, refusal to mutate against old runtime responses, and storage-specific quota errors.
- In one offline measurement using duplicated representative birth outcomes, 512 legacy receipts used 263,797 bytes; compaction plus the envelope used 28,560 bytes with 48 retained receipts. 2,000 receipts used 1,028,629 bytes before and the same 28,560 bytes after. These intentionally oversized legacy fixtures demonstrate migration and are not claims that production APS accepts oversized writes. Byte counts vary with outcome content.

## Private installed-app verification

App 0.1.4 (version ID 1180) / tool 0.1.5 (Executa version ID 671), working draft revision 6, was installed privately on 2026-10-09. The existing partner returned prefix `nb2:0:`. One `start` request against the existing partner correctly returned `already_started` and committed the migration with prefix `nb2:1:` without awarding XP or replacing the partner. Closing and reopening the app preserved the new sequence, 모찌 at 10 XP, two existing chat messages and the AI portrait. No paid AI calls or new partner were created for this check. Windows/Linux CI passed; this is not a claim that both OS-specific Anna installations were manually exercised.

## Scope still to review

This bounds the **game document**. App-scope chat and portrait metadata, old portrait objects, account-wide quota, privacy/deletion controls and APS backups are separate concerns. The local-file backup and decay jobs do not manage APS storage. Existing user data must not be deleted merely to recover quota.
