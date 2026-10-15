# 1.2.0 · Dungeon item rewards and inventory

App **1.2.0**, game tool **0.8.0**. This source implements regional cosmetic collection. Deployment is pending until both platform packages and the installed owner app have been verified. Review candidate **1.0.0** and its shared listing must be preserved.

## Behavior

- Each final guardian win grants one previously unowned item for its region, in a fixed order: three standard rewards, then the rare fourth reward. All five regions are supported, for twenty collectible cosmetics.
- Intermediate rooms, defeat, draw and result replay award no additional item. Each item is owned once; completed regional collections keep their existing coin rewards. Walk costs, discovery limits, daily clear limits, route coins and boss coins are unchanged.
- **My inventory** opens the owned filter. Catalog cards and details distinguish owned and missing items, and final results name the item received. Korean/English and 360px layouts are supported.
- Existing saves start with an empty collection without a read-time write. No retroactive rewards. Item ownership, coins, clear state and retry receipt commit together. Failed storage claims no reward and retry replays the same outcome. Reset/removal discards the old companion’s collection.
- Four common items remain marked unavailable. Shops, equipment, anatomy analysis and fitted portrait generation are deferred. No extra AI calls or artwork generation.

## Validation

Local JavaScript **82/82**, strict manifest and engine **207 tests (one optional skip)** passed. Added tests cover every region’s full collection and exhausted rewards, old-save reads, parallel final choices, replay, malformed ownership, failed APS commit and account isolation. Browser **91/91**, two additional inventory/final-reward UI checks and storage/protocol **66/66** passed. CI source and installation evidence will be recorded after completion.

## Remaining limits

The existing [first-creation concurrency limitation](../docs/FIRST_CREATION.md) remains. No new review submission or public release is authorized by this update. Identity-preserving equipment portraits require image-edit support and quality validation.
