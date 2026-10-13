# Notebuddy 0.4.1 — discover on walks, enter within 24 hours

Candidate app **0.4.1**, game tool **0.2.1**. Deployment and installed-runtime checks are pending.

Previously all three dungeon cards and previews were visible before discovery, and the first walk plus every third missed roll guaranteed a discovery. Now every successful walk uses a 25% roll, with no guaranteed first find or pity counter. Only discovered, unexpired dungeons are returned by the game and displayed by the UI. Pixel companions remain available in the growth album.

Each new discovery lasts **24 hours from discovery**, as chosen by the user. Cards and entry previews show a countdown based on server time. Expired entries disappear and the server refuses new entry without spending a charge. Existing recorded expeditions can still be replayed after expiration. The discovered boss keeps its element across midnight; daily reward limits still reset at midnight Korea time. A region already rewarded that day cannot be rediscovered until the next day. Pre-0.4.1 discoveries keep their original midnight deadline, preserving existing saves without extending them.

The exploration dialog uses **96% of the app viewport width and 94% of its height**. Desktop places the large map beside the controls; narrow screens stack them. Expiry disables entry even when the preview is already open.

See [DUNGEONS.md](DUNGEONS.md) for full rules. Existing pets, portraits, conversations, coins and saved results are retained. The 0.3.4 review candidate and its shared listing must remain intact during test deployment.
