# 1.4.14 — Japanese and Chinese support

Prepared on 2026-10-19 at the owner's request, including explicit authorization to update the review candidate after deployment. App **1.4.14** and game tool **0.9.6** are pending deployment. Public Anna **1.4.13** remains live; web remains on hold.

- Add Japanese, Simplified Chinese and Traditional Chinese alongside English and Korean. Keep a distinct saved preference for each language and appropriate local CJK font fallbacks. Cover menus, creation/recovery, care, quests, evolution, home/furniture, collections, dungeons and static walk stories.
- New chat, care, walk, evolution and requested decoration prompts use the selected language/script. Language switching never asks AI or translates previous chat, portraits or stories. New personalities may store an optional creation-language description while old bilingual records remain valid and unchanged.
- Extend the authoritative evolution prose validator and Anna tool language enum to accept the five locale codes. Localize response labels after committing the unchanged receipt; changing language on a retry never duplicates rewards or changes the pet name.
- Retain the latest album containment fix. Correct privacy retention copy to the existing behavior: up to **64 messages / 40 KB saved**, latest **24 displayed**. Retention behavior itself is unchanged.

Translation budget used: **six authorized text calls / zero images**, public static copy only. Results saved before parsing; no paid retries. Traditional Chinese conversion is offline; native-speaker editorial review remains unperformed. See [resource provenance](../locales/README.md).

Validation/deployment evidence will be recorded after Windows/Linux packaging, installed UI/tool and review verification.
