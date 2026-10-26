# SD1.5 birth portrait quality: preparation, not a passed quality result

The only real generated image inspected so far is the earlier SM-F741N probe output. No PC inference, external image API, new model download or phone action was used for this follow-up.

## Observed pixels

Synthetic source: green oval body, two tall triangular ears, two white oval eyes with dark pupils, a small dark triangular mouth, two small feet, and a red diamond on the body's right side on a clean white background. The 256px result kept the broad green/ear/eye identity but rounded the red diamond into a pink spot, altered eyes and mouth, softened/doubled contours, and added colored marks and faint geometric noise to the background. This is a failed visual-quality sample despite producing a valid new PNG. See the existing workspace `evidence/image-generation/generated-preview.png` and bundled `imageprobe/src/main/assets/green-creature.png`.

## Prepared changes and rationale

- Reuse Anna 1.4.13 `checkArtwork` and `reviewDecision`: allowed/unclear/rejected, <=1200-character observations, validated species/element/confidence. Native Gemma supplies the actual text response; no fixture or hard-coded assessment is used in the app. Uncertain findings require explicit confirmation. Malformed/rejected/failed analysis never starts image generation.
- SD-specific text begins with the actual observations, then identity constraints. It does not instruct every input to become a generic monster/full-body character. Human references remain human, absent limbs stay absent, cropped framing is retained. SD1.5's adherence to these instructions is unverified; prompts are guidance, not an anatomy guarantee.
- Use centered white padding with uniform scale instead of stretching every source to a square. This deterministically preserves input geometry before inference; it cannot guarantee that diffusion preserves it afterward.
- Prepare strength **0.40** instead of **0.55** to reduce destruction of the source's layout/markings. Increase requested steps **12→20** to avoid reducing the already short effective denoising sequence when lowering strength. Effective step count must be read from native progress; the lower strength may also produce too little characterization. Neither quality nor latency is claimed improved until a phone comparison.
- Keep **256px, seed1026, Euler A, CFG6, phone CPU4, q4_0** unchanged for the first bounded comparison. Keeping these controls limits attribution changes and avoids an unmeasured 384/512px memory/time increase. 256px and quantization remain likely limits on detail, but their contribution has not been isolated experimentally. Do not automatically increase resolution or repeat a poor result.
- Negative conditioning targets noisy backgrounds, duplicate subjects and text. It no longer globally prohibits extra eyes/limbs, which could contradict unusual but valid references. The positive observed limb count remains authoritative guidance.

The earlier 174.861s / peak RSS5710496KiB measurement belongs to the previous prompt/settings, not this combined Gemma→SD pipeline. Analysis initialization and 20 requested sampling steps can increase latency. Gemma is closed before SD loads, and the SD context is released before subsequent Gemma calls. Active text/vision/image requests keep only the app window awake; backgrounding cancels them. No device lock/security preference is changed.

## Next phone session, only after permission to resume

1. Verify the same serial/package/signing identity and use `adb install -r` on the isolated `.lab.ondevice` package. Do not uninstall any app. Existing SD/Gemma files should be reused; check their presence before any action and stop if absent rather than downloading.
2. Run the explicit offline-only Gemma verification action. It hashes existing bytes, writes the receipt only after a match and has no network fallback.
3. Use the bundled synthetic fixture/test notebook. Cancel an analysis, wait for the worker to finish, then run one complete analysis→SD request (confirm uncertainty if shown). Record input/observations/settings/seed, real PNG, total and native times, memory and thermal observations. No personal images.
4. Recreate before final save to confirm pending-preview recovery, then explicitly save and recreate again. Compare source/result hashes and normal-notebook snapshot preservation.
5. Inspect contour, eye/ear/limb counts, red diamond shape/position, background cleanliness and readability. Reject visually poor output even when all functional checks pass. Stop for overheating/memory pressure; no automatic retries or model changes. Decide any further same-model comparison or alternative free on-device model separately.

PC controller/browser/JVM tests prove routing, state, storage and geometric preprocessing only. Mock output is deliberately a simple colored fixture and is never quality evidence. Evolution/home/garment image generation and Anna's automatic initial-personality flow are outside this minimal birth-generation correction; no complete Anna parity is claimed.
