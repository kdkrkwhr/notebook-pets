# Expansion art · 1.1.1 · 2026-10-15

Generated with Codex's built-in `image_gen` tool during development. No Anna AI allowance or player data was used. The selected files were copied unchanged into the repository; `anna/scripts/prepare_assets.py` includes them in the app bundle.

| File | Use |
| --- | --- |
| [sunkenpalace.png](sunkenpalace.png) | 1536 × 1024 Sunken Palace discovery-card illustration |
| [clockworkcity.png](clockworkcity.png) | 1536 × 1024 Clockwork City discovery-card illustration |
| [guardians-expansion-v1.png](guardians-expansion-v1.png) | 1536 × 1024 RGBA, three pose columns × two boss rows |

These environments are discovery illustrations. Exploration still renders the room/corridor layout and its traversable floor, as it does in the original three regions. The boss sheet is used in the actual final encounter: top row Crown Keeper, bottom row Clockwork Golem; columns idle, wind-up and attack. Runtime downsamples square cells to preserve the pixel appearance and original proportions. Alpha transparency and empty cell gutters are checked in browser tests; desktop/mobile scene captures are visually inspected.

Two earlier portrait-layout boss sheets were rejected because they lacked sufficient space between cells. They are not shipped. The selected landscape sheet below was generated from a new prompt, with no reference input.

## Sunken Palace · exact prompt

Transparent background: false. No reference input.

> Create a production pixel-art environment illustration for SUNKEN PALACE, an original dark-fantasy pet RPG. Landscape 1536x1024. Elevated three-quarter orthographic camera, full-bleed compact dungeon viewed from above, no horizon. A broad lower-left entry court with worn turquoise stairs, a middle-left coral shrine, a diagonal stone bridge crossing a deep blue flooded chasm, an upper-right circular royal arena with an ancient sealed pearl-gold palace doorway. Detailed drowned royal architecture: jade masonry, carved sea-serpent reliefs, broken crowns, coral and sea grass at edges, tiny golden lanterns, teal caustic light. Readable clear stone paths, atmospheric depth, crisp hand-crafted pixel clusters and restrained highlights, premium dark-fantasy indie game quality. The central 90 percent must contain the readable environment. No character, enemies, boss, UI, text, labels, borders, grid, logo or watermark. This is an environment illustration for the discovery preview; not a tileset, not a poster.

## Forgotten Clockwork City · exact prompt

Transparent background: false. No reference input.

> Create a production pixel-art environment illustration for FORGOTTEN CLOCKWORK CITY, an original dark-fantasy pet RPG. Landscape 1536x1024. Elevated three-quarter orthographic camera, full-bleed compact dungeon viewed from above, no horizon. A broad lower-left brass-and-stone entry court with short stairs, a middle-left abandoned workshop shrine, a diagonal stone bridge crossing a deep machinery chasm, an upper-right circular arena with a sealed monumental astronomical clock gateway. Detailed abandoned industrial royal architecture: oxidized brass gears, aged limestone, rivets, dormant pistons and pipes at edges, hanging clock weights, tiny cyan energy lamps against warm amber highlights. Immense gear silhouettes and wisps of steam deep below. Readable clear stone paths, atmospheric depth, crisp hand-crafted pixel clusters, restrained highlights, premium dark-fantasy indie game quality. The central 90 percent must contain the readable environment. No character, enemy, boss, UI, text, readable numerals, labels, borders, grid, logo or watermark. This is an environment illustration for the discovery preview; not a tileset, not a poster.

## Expansion bosses · exact selected prompt

Transparent background: true. No reference input. Generated alpha is preserved.

> Production pixel sprite sheet. Landscape 1536x1024. EXACT 3 columns by 2 rows, square 512x512 cells. Only SIX SMALL isolated creatures on completely TRANSPARENT background. VERY GENEROUS EMPTY SPACE: each creature including all effects occupies ONLY THE CENTRAL 55 PERCENT of its own cell, never near cell edges. Max creature footprint 280x280 in each 512x512 cell. Approximately 110 pixels empty transparent padding around every side. TOP ROW same turquoise coiled sea-serpent boss with pearl coral crown and small gold lantern: left idle, middle leaning back to wind up, right striking left with a SMALL water splash kept inside the silhouette area. BOTTOM ROW same heavy brass clockwork golem with cyan chest core, short legs, piston arms and windup key: left idle, middle arm raised, right punching left. Consistent creature size within each row. Entire bodies small and fully visible in each cell, three-quarter overhead game view, facing left. Crisp detailed premium indie pixel art, NOT smooth cartoon, no environment, no gradients, no halo, no shadows, no scenery, no grid lines, no text or numbers. Genuine alpha transparency outside each sprite. Leave the grid gutters entirely empty; no pixels should cross from one cell to another. This sheet will be cut at x=512,1024 and y=512 exactly.
