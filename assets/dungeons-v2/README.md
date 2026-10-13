# Dungeon art v2 — 2026-10-13

These are the actual bundled environments and boss atlas for Notebuddy 0.4.2. Generated with Codex's built-in image generation tool during development, then copied unchanged into this directory. No Anna model or user allowance was used. `anna/scripts/prepare_assets.py` copies the four PNG files into the app bundle.

| File | Use |
| --- | --- |
| [hellgate.png](hellgate.png) | 1536×1024 ember fortress environment |
| [icekingdom.png](icekingdom.png) | 1536×1024 frost palace environment |
| [dreamforest.png](dreamforest.png) | 1536×1024 forest sanctuary environment |
| [guardians.png](guardians.png) | 1536×1024 RGBA atlas, 3 bosses × 3 poses |

The environments are scrolling background paintings in a pixel-art style, not seamless tiles or collision maps. The renderer places a hand-authored route on the visible floor. The boss atlas is cropped into equal thirds at runtime; columns are ember knight, frost guardian and spectral stag, and rows are idle, wind-up and attack. Transparent margins were checked. Player portraits use the existing local 64px conversion and are not part of this atlas.

Desktop and 360px screenshots were inspected, including entry, camera travel and combat. Pixel-cluster size differs between the generated environment and the locally converted player portrait. Directional walking frames, free movement and roaming enemies remain separate work.

## Hellgate production brief

The first tool-call text was not retained verbatim; this is its production brief. An original dark-fantasy pixel RPG environment, three-quarter overhead orthographic camera, full-bleed landscape 1536×1024. Bottom-left entry courtyard and stairs; a sanctuary room in the middle left; a continuous diagonal stone bridge leading to an upper-right circular boss arena and monumental sealed gate. Detailed weathered gothic stone, iron railings, ember light and lava chasms; clear walkable floor, crisp pixel clusters and atmospheric depth. No characters, enemies, text, HUD, border, minimap layout or distant horizon.

## Ice Kingdom — submitted prompt

Use case: stylized-concept. Create a production scrolling game-level background for ICE KINGDOM, using the attached Hellgate environment solely as camera, geometry and pixel-art quality reference. Keep EXACTLY the same traversable floor layout, framing and platform heights: entry courtyard and stairs at bottom-left, small chapel room mid-left, a wide diagonal bridge across the center to a circular upper-right boss arena, monumental sealed gateway at top-right. Rebuild the architecture as an abandoned frost palace: carved cold slate and pale stone, royal reliefs, crystalline frost on margins, icicles under railings, still dark blue glacial chasms below, sparse turquoise lanterns and delicate drifting snow. Distinctive beautiful premium hand-crafted pixel art with crisp clusters, strong material detail and atmospheric blue light. Keep the walkable floor clear, readable and continuous, with the same visible path coordinates. No character, enemy, text, HUD or border. No distant horizon. Full-bleed wide 1536x1024 landscape game background, not a poster and not a minimap. Original art, no franchise symbols.

Input reference: generated Hellgate environment. Transparent background: false.

## Dream Forest — submitted prompt

Use case: stylized-concept. Create a production scrolling game-level background for DREAM FOREST, using the attached Hellgate environment solely as camera, geometry and pixel-art quality reference. Keep EXACTLY the same traversable floor layout, framing and platform heights: entry courtyard and stairs at bottom-left, small sanctuary room mid-left, a wide diagonal bridge across the center to a circular upper-right boss arena, tall sealed gateway at top-right. Rebuild the space as ancient ruined forest sanctuary architecture: mossy jade stone, enormous gnarled roots alongside the paths rather than blocking them, carved weathered standing stones, luminous tiny mushrooms, pale lavender spirit lights, deep teal forest mist in chasms, leafy canopy framing outer edges, root-and-stone archway in the far arena. Slightly haunting and beautiful, restrained magic. Premium hand-crafted pixel art with crisp clusters and detailed material shading. Keep walkable floor clear, readable, continuous and at the same coordinates. No character, enemy, text, HUD or border. No distant horizon. Full-bleed wide 1536x1024 landscape actual game background, not a poster/minimap. Original art.

Input reference: generated Hellgate environment. Transparent background: false.

## Guardians — submitted prompt

Use case: stylized-concept. Asset type: production transparent pixel-art enemy animation atlas for a three-quarter top-down dark-fantasy action RPG. One transparent 1536 by 1024 PNG, precisely 3 columns and 3 rows of equal-sized cells. Nine isolated full-body sprites, no backgrounds or ground tiles; genuine alpha transparency. Each column is a distinct original boss. LEFT column: hulking black iron ember-armored gatekeeper with a heavy sword, small molten cracks. CENTER column: ornate blue-silver frost crown guardian with ice spear and flowing ragged blue cape. RIGHT column: imposing spectral forest stag, four legs, ancient wooden antlers, moss and a faint violet inner glow. ROW 1: idle guard stance. ROW 2: clearly different attack wind-up pose. ROW 3: clearly different sweeping attack pose. All face diagonally toward bottom-left, elevated three-quarter game perspective. Crisp detailed hand-crafted pixel clusters, premium indie dark-fantasy sprites, strong coherent silhouettes, restrained highlights, NOT cute cartoon vector illustration. Each figure entirely within its own equal cell with generous 12% transparent margin; place its ground-contact baseline near 87% of its cell height. Preserve same proportions, character identity, approximate size, facing and lighting within each column across the three animation poses. No text, no labels, no grid lines, no floors, no scene, no UI, no logo, no watermark. Real transparent background, no checkerboard pixels. The sprites will be cropped at exact third-width/third-height cell boundaries by the game renderer.

No input reference. Transparent background: true. Source alpha is preserved.

