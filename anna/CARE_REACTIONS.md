Latest validation: [10 October live verification](LIVE_VALIDATION_2026_10_10.md). Four-stage image sample, real care/reopen, real-time walk recharge and isolated reset passed in the documented environments; hosted bundle upload and end-to-end artwork UI remain blocked. Artwork birth now prioritizes assigned species anatomy after an observed mismatch.

# Automatic care reactions — develop

Successful feed, snack, play, sleep, train, walk, battle, flee, attendance and claimquest actions enqueue a short English/Korean AI response after gameplay commits. Start, reset, status and rejected actions do not trigger it. The pending bubble uses the pet name. Care buttons remain usable while reactions run sequentially in the background. Each event captures its original language and authoritative result; AI never mutates game state.

The request ID and pet ID form a deterministic reaction ID. An in-page seen set suppresses duplicate enqueue; a conditional CHAT merge reserves a pending entry before calling AI. Existing entries stop a repeated request. A lost game reply only triggers after the original game receipt is confirmed. The existing 24-entry chat retention bounds reservation history; this is not a global/permanent exactly-once guarantee. Anna's first-row atomic creation limitation remains. Reopen does not resume paid requests.

Generated replies replace the pending entry. Failed AI calls preserve the game and show a local failure. A received reply that cannot be saved remains in an overlay with an explicit save-only retry, independent from manual chat retries. Reset/removal/partner-change clears queued and pending work; results are checked against the active companion before storage writes. Already dispatched requests may still consume allowance after cancellation. Pending/failed entries are excluded from ordinary chat prompt history. Live output quality is not established by mocked browser tests.

No new storage key or permission is introduced. CHAT markers and replies participate in existing reset/removal and privacy behavior. The submitted app and release branch remain unchanged until a separately verified candidate is deployed.
