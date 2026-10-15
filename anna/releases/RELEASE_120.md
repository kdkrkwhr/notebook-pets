# 1.2.0 · Dungeon item rewards and inventory

App **1.2.0**, game tool **0.8.0**. Owner test deployment completed: app **ID 1400**, working revision **52**, tool **Executa version 755**. Installed as `0.0.0-draft`, `dirty_vs_latest_cut=false`. Source **`38241df0bfd5835aa983cf57fb2deaa15a910e29`**. Review candidate **1.0.0 / ID 1383 / pending_review** and its shared listing are preserved.

## Behavior

- Each final guardian win grants one previously unowned item for its region, in a fixed order: three standard rewards, then the rare fourth reward. All five regions are supported, for twenty collectible cosmetics.
- Intermediate rooms, defeat, draw and result replay award no additional item. Each item is owned once; completed regional collections keep their existing coin rewards. Walk costs, discovery limits, daily clear limits, route coins and boss coins are unchanged.
- **My inventory** opens the owned filter. Catalog cards and details distinguish owned and missing items, and final results name the item received. Korean/English and 360px layouts are supported.
- Existing saves start with an empty collection without a read-time write. No retroactive rewards. Item ownership, coins, clear state and retry receipt commit together. Failed storage claims no reward and retry replays the same outcome. Reset/removal discards the old companion’s collection.
- Four common items remain marked unavailable. Shops, equipment, anatomy analysis and fitted portrait generation are deferred. No extra AI calls or artwork generation.

## Validation

Local JavaScript **82/82**, strict manifest and engine **207 tests (one optional skip)** passed. Added tests cover every region’s full collection and exhausted rewards, old-save reads, parallel final choices, replay, malformed ownership, failed APS commit and account isolation. Browser **91/91**, two additional inventory/final-reward UI checks and storage/protocol **66/66** passed. [Engine CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38739685672) and [Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38739685615) passed on Windows and Linux for that exact source. Each standalone binary was smoke-tested for final item rewards, status ownership and replay before packaging.

## Installed verification

- Official push produced ready working revision 52; cut created app version 1400 and pinned tool 0.8.0 / Executa 755. Working-draft installs succeeded for the original cloud default and then Windows PC. The temporary default-agent change was restored to cloud.
- Both agents report **agent_version=0.8.0, agent_loaded=true, agent_running=true**. The actual installed iframe reports **Connected**, no notice, twenty-four catalog cards, the owned filter and the new inventory button. Opening inventory preserves the existing companion and shows no retroactive rewards.
- Installed `app.js`, `item-catalog.mjs`, `items.mjs`, `dungeon.mjs` and `style.css` all returned HTTP 200 and matched local SHA-256. The entry HTML rejects a separate fetch with HTTP 403 even using the iframe URL; its hash is not claimed. The live iframe DOM contains the new inventory controls and the original decoded portrait.
- Chat, artwork and personality-draft values and ETags match the pre-deployment snapshot. Companion identity, name, XP and portrait path also match. Two completed walks were added during validation: game ETag and story changed, with all earlier seen story IDs retained. We preserved the newer progress and did not restore old snapshots. This verification itself performed no game actions, walk consumption, paid AI, portrait generation or reset.
- CLI push reuploaded unchanged store screenshots. Their shared URLs were restored to the six original values; a fresh GET confirms all snapshotted metadata, screenshot URLs and review fields match the original. No review submission or public release occurred.

## Tested package hashes

| Platform | SHA-256 |
| --- | --- |
| Windows x86_64 | `80e890303ef97d0016d2ccf416b4522a56f0e79985760760254b9d0d134e70d8` |
| Linux x86_64 | `5ac12d7e67695aa17f904b48ea5c291e82cbc28fa6b43c9919bf8f8f57a9af6e` |

## Remaining limits

The existing [first-creation concurrency limitation](../docs/FIRST_CREATION.md) remains. No new review submission or public release is authorized by this update. Identity-preserving equipment portraits require image-edit support and quality validation.

No production dungeon was consumed to manufacture an owned reward for verification. Full reward grants were checked with isolated engine/APS/UI fixtures and both standalone platform packages.
