# 1.4.0 — My little home

App **1.4.0**, tool **0.9.0**. Owner test deployment pending; currently installed Anna app remains 1.2.1 until verified. Public review candidate 1.0.0 is preserved.

Users buy furniture with game coins; their companion chooses placement based on its saved personality. A separate 2D room renders walls, floor, twelve furniture sprites and the existing pet artwork. Buying leaves furniture in storage. Only explicit **Decorate** makes one bounded LLM request (maximum 160 output tokens), choosing among core-validated candidates. Walking, carrying furniture, idle movement, undo and save-only retry make no AI requests.

The pure Python core owns prices, coins, ownership, geometry, entrance clearance, reachable transport paths and stale revision protection. AI cannot invent coordinates or currency. One request places at most three stored objects. Invalid AI responses leave the room intact; an uncertain save retries the same action without generating again. The previous layout can be restored while retaining purchased furniture. Existing pet, portraits, conversations, rewards and stats are preserved.

Scope: one room, free nest plus eleven purchasable objects, original hand-painted sprite atlas. Character movement uses the existing portrait with motion effects rather than directional walking sprites. No manual placement, new generated room images, recurring AI, gameplay bonuses, or public release. Web home integration is outside this Anna release.

Validation and installed evidence will be recorded after the Windows/Linux CI packages are deployed.
