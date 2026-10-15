# First-partner creation: accepted submission limitation

Checked on 2026-10-09. The owner now authorizes review submission without waiting for undocumented Anna capabilities or direct platform confirmation. This supersedes the earlier release-blocker decision; the race below is NOT fixed and remains tracked for follow-up. No external database was added, and no support message has been sent.

## What is protected

The adapter serializes calls inside one process. Existing saves use APS `if_match` with the ETag returned by `get`; a conflict reloads and recomputes the action, at most three attempts. Original engine receipts keep a retried successful action from awarding twice.

Tool 0.1.4 also reads the key again after computing a first partner and before writing it. If another agent has saved a partner during that computation, the adapter discards its candidate and reloads the winner. A failed recheck does not perform a write. An invalid existing save is preserved.

This additional read reduces exposure. It is not a distributed lock or an atomic create-if-absent operation.

## What is still unsafe

Two independent agents can still follow this schedule:

1. Agent A reads a missing key, computes a partner, and rechecks: still missing.
2. A pauses immediately before its first `storage/set` request reaches APS.
3. Agent B creates a different partner and commits a care action (10 XP).
4. A's unconditional first write arrives and replaces B's partner and progress.

Reading immediately before writing cannot eliminate this final gap. A local lock does not coordinate separate devices or cloud agents. A post-write read can detect some races but cannot prevent a later write from replacing a result already returned as successful.

Do not substitute `if_match=""`, `if_match="*"`, or an invented `if_none_match` argument. The supported first-write path is an unconditional upsert. Do not bootstrap a shared lock using that same unsafe first write and describe it as atomic.

## Evidence and API contract

- [Executa APS reference](https://anna.partners/developers/reference/executa-persistent-storage.md), `storage/set`: `None` is unconditional, and there is no separate `if-none-match` mode.
- [Host storage reference](https://anna.partners/developers/reference/host-api-storage.md), `storage.set`: an ETag mismatch, including a missing row, produces `precondition_failed`. Its note about simultaneous SQL inserts does not protect a delayed unconditional upsert that arrives after another insert has committed.
- [Anna platform response, 2026-09-10, section 3](https://forum.anna.partners/t/timeline-studio-production-wasm-csp-blocker-and-strict-validator-false-positive-minimal-reproductions/296/3): an empty `if_match` is not create-if-absent; the platform logged this capability as an enhancement.
- Pinned Python SDK at commit `49749905d443a7e8e7479a8faab39c03c7f16c16` sends `if_match` only when non-None. It exposes no first-write precondition.
- CLI 0.1.57's in-memory storage accepts an empty `if_match` for a missing key. That differs from the documented production contract. The repository test double rejects it; a local harness passing this case is not production evidence.

## Offline reproduction

From `anna/`:

```powershell
uv run --locked --project executas/notebuddy python -B -X utf8 scripts/reproduce_first_creation_race.py
```

This uses two independent `GameService` instances and a shared in-memory APS contract model. An explicit event pauses A at `set`; there is no timing-sensitive sleep, network access, token, paid AI call, or real save modification.

Current expected result:

```json
{
  "environment": "offline APS contract simulation",
  "both_creations_reported_success": true,
  "original_partner_overwritten": true,
  "progress_lost": true,
  "release_blocker_reproduced": true
}
```

Exit code **1** is intentional: the release-blocker probe fails until this schedule is safe. It is separate from the passing regression suite. An unexpected exception is an investigation failure, not evidence that the race is fixed. A future exit code 0 only clears this schedule; it does not prove the production service or all schedules safe.

`tests/test_creation.py` covers the supported safeguards: a winner committed after the initial read, same-request retry, preservation of care progress and invalid saves, recheck failure, first-insert conflicts, missing/stale ETag rejection, independent-service action retries, and exhausted conflict retries.

## Closure criteria

Obtain a documented, supported atomic operation through the **Executa reverse-RPC tool scope**, with behavior for both missing and existing keys. Validate the host implementation, not just the development mock. Then test delayed writes, simultaneous creation with different names and IDs, retries after a lost response, restarts, and preservation of care actions committed after creation. The original partner must remain the only partner and creation must never roll back its progress.

## Prepared question for Anna (not sent)

> We are building Notebuddy, a lifelong-companion app. The game uses Executa APS `scope="tool"` and ETag updates. We recheck a missing key immediately before the first write, but a delayed unconditional `storage/set` can still overwrite a partner and care progress committed by another agent. Your September 10 response says atomic create-if-absent is not available. Has a supported first-writer-wins operation shipped since then, including the Python SDK / Agent reverse-RPC path? If so, could you provide the API contract, minimum host/SDK versions, and conflict behavior for an existing key? Our offline reproducer pauses the first write until another agent has created and cared for its partner. We can share the reproducer without credentials or user data.
