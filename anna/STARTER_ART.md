# Starter artwork alignment — app 0.1.11

The old bundle copied 72 legacy samples, then overwrote only four combinations with approved stage-one art. Most newly created or reset companions therefore showed the previous art style until the user generated a personal portrait.

The complete `assets/starters-v1` set replaces that mixed source. The approved four anchors are retained; the other 68 combinations use the built-in image generation tool with those approved images as references. Local ComfyUI candidates were excluded after visual comparison. Exact prompts, available original seeds, references and output hashes are recorded next to the images. Open `../assets/starters-v1/index.html` to review the set.

Asset preparation checks every species/element combination and SHA-256 before copying any new starter. Starter URLs use `assets/starters-v1/` so existing browser cache entries for the old samples cannot win. Generated legacy copies are removed from the build directory; original source samples remain in the repository.

The Anna image request also removes the earlier notebook-page and colored-pencil direction and asks for the same plain-background painted style. Anna's image provider and the built-in tool are different generators, so identical rendering is not guaranteed. No personal portrait is regenerated automatically or overwritten, and no AI allowance is spent merely by starting or resetting a game.

Existing personal portraits still take priority. Companion identity, species, element, growth, chat and album storage are unchanged. This is an app/UI asset change; game tool 0.1.8 is unchanged.

Verification covers the complete bundled set, file integrity, fresh-companion image decoding and absence of paid image requests, plus the existing saved-portrait/retry checks. Deployment evidence is recorded in HANDOFF.md after verification.

Local verification passed: 30 Node tests, 14 browser tests, 46 Python tests and strict manifest validation. All 72 images were reviewed in species contact sheets. Store screenshots were recaptured with the actual UI/engine and isolated local state, with no AI calls or real account data.

Private deployment: app 0.1.11/version ID 1215, draft revision 13, game tool 0.1.8/version ID 686 unchanged. The installed draft loaded the new starter path and three representative images successfully. The current companion and saved personal portrait loaded normally; no real gameplay mutation, reset, removal or AI call was made for verification. Source `db7f2e8` passed [Anna Windows/Linux CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/37938799719) and [engine CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/37938799728). No review submission or public release was performed.
