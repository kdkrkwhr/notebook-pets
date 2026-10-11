# Notebuddy 0.3.4 — drawing-led birth

Drawing review returns validated species, element (or random with no cue), confidence and up to 1200 characters of visual observations. Only ambiguous species interpretations require confirmation before a pet is created. Cancel keeps the drawing and cached assessment without a new AI request. Random starts are unchanged.

Game tool 0.1.15 accepts allowlisted birth_species/birth_element only for start. The worker applies them to a new temporary candidate before the existing conditional APS commit, recalculates result/view metadata, and retains those traits on retries. Existing pets cannot be rerolled with these fields. Unknown values and non-start use are rejected. No engine rules or reward balances change.

Generation prioritizes the original silhouette, limb count (including absent limbs), face, palette and markings. Species is a category and element a subtle accent, not a mandate to replace anatomy. Redraws and growth portraits for drawing-born companions reuse the saved original observations. Text-guided generation remains approximate; this is not direct image editing or a guarantee of exact likeness. Existing companions are not reclassified or reset.

The reviewed 0.3.2 remains separate. Live model classification/likeness needs visual evaluation in the test app; automated tests exercise schemas, prompts, persistence and recovery, not model accuracy.

## Validation and test deployment (2026-10-11)

- Local release checks: 49 JavaScript unit, 47 browser recovery and 54 Python tests passed; strict manifest validation passed.
- GitHub Actions run 38114946929 passed on Windows and Linux, including standalone binary smoke tests. Deployed packages came from that successful build at ad2f856.
- Develop merge preserved direct-edit evolution and its existing UI behavior; both new drawing browser scenarios passed after merging.
- Anna app 450: working revision 32 is ready; immutable version 0.3.4 is version ID 1282. Game tool 0.1.15 is frozen as Executa version 711.
- Working draft installed successfully. Plugin status confirmed server/running version 0.1.15 and agent_loaded=true.
- Review candidate remains 0.3.2, pending_review. Its shared description and privacy URL were restored and verified after upload.
- No existing pet data was reset or reclassified. Real model likeness remains a manual test in the installed app.
