# Item catalog · 1.1.2

The catalog has **24 items**: common gear and four items for each of Hellgate, Ice Kingdom, Dream Forest, Sunken Palace and Forgotten Clockwork City. It is a read-only preview, available from home after creating a companion, with English/Korean names and lore, region/type filters, text search, rare-item labels, detail views, planned acquisition and attachment requirements.

No collection, ownership, gift, purchase, coin spending, equipment, avatar regeneration or body analysis is implemented in this release. The welcome gift, coin unlocks and repeated-clear rewards are plans, clearly labeled in the UI. Prices and milestone counts remain unset. Browsing performs no game actions, storage writes or AI calls and grants no rewards. It does not alter the current 1.0.0 review listing.

## Items

| Type | Common | Hellgate | Ice Kingdom | Dream Forest |
| --- | --- | --- | --- | --- |
| Head | Little Traveler’s Hat | Ember Horns | Frost Crown (rare) | Moonlit Flower Crown |
| Neck | Red Scarf | Sealstone Pendant | Snowflake Scarf | Dewdrop Necklace |
| Back | Beginner’s Cape | Blazing Cape (rare) | Aurora Cape | Butterfly Cape |
| Surrounding effect | Little Starlight | Drifting Embers | Drifting Snow | Firefly Companions (rare) |

Definitions and localized descriptions are in `bundle/items.mjs`; art and exact built-in image-generation prompts are in `../assets/items-v1/`. Icons are static illustrations, not fitted character images or animations. Artwork loads from the application bundle.

### Expansion items · 1.1.2

| Type | Sunken Palace | Forgotten Clockwork City |
| --- | --- | --- |
| Head | Coral Pearl Tiara / 산호 진주 왕관 (rare) | Clockmaker’s Goggles / 태엽 고글 |
| Neck | Seashell Pearl Pendant / 진주 조개 펜던트 | Pocket-Watch Necklace / 회중시계 목걸이 |
| Back | Tide Cape / 물결 망토 | Brass-Gear Cape / 황동 톱니 망토 |
| Surrounding effect | Deep-Sea Bubbles / 심해 물방울 | Little Clockwork Orbit / 작은 태엽 무리 (rare) |

All eight use the same preview, planned reward and fit rules as the original sixteen. [Exact illustration prompts](../assets/items-v1/prompts-112.json).

## Future fit model

- Collection and wearing are independent. A character may own an item it cannot wear.
- Analyze the **final generated portrait**, rather than deriving anatomy from species or blindly reusing the source sketch. A ghost may have hands, and a reptile may be a legless snake.
- Record each relevant part/attachment area as **present / absent / unknown**. Cropping, occlusion and ambiguity mean unknown, not absent. Check again after evolution or a new portrait; associate the assessment with that exact portrait so it cannot leak between companions or versions.
- A glove requires visible hands: present permits consideration, absent blocks wearing, unknown requires confirmation. Boots similarly need feet. No item may create missing anatomy.
- Head, neck and back items require an actual suitable attachment area and must preserve ears, horns, leaves, wings and body shape. Surrounding ornaments require no limbs. A cape shaped like butterfly wings is cloth, not permission to create anatomical wings.
- Body classification and geometric placement are distinct: knowing that a hand exists does not guarantee that a glove can be rendered correctly. Preserve character identity and verify the fitted result before exposing it as successful equipment.
- Analysis is planned per portrait, not per catalog click. Character regeneration remains an explicit AI action, with usage disclosed. Runtime inspection and persistent fit data are deferred until equipment is implemented; the current catalog only explains item requirements.

Items for the remaining planned dungeons will be considered when those regions are implemented.
