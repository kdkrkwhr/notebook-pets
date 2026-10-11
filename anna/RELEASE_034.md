# Notebuddy 0.3.4 — drawing-led birth

Drawing review returns validated species, element (or random with no cue), confidence and up to 1200 characters of visual observations. Only ambiguous species interpretations require confirmation before a pet is created. Cancel keeps the drawing and cached assessment without a new AI request. Random starts are unchanged.

Game tool 0.1.15 accepts allowlisted birth_species/birth_element only for start. The worker applies them to a new temporary candidate before the existing conditional APS commit, recalculates result/view metadata, and retains those traits on retries. Existing pets cannot be rerolled with these fields. Unknown values and non-start use are rejected. No engine rules or reward balances change.

Generation prioritizes the original silhouette, limb count (including absent limbs), face, palette and markings. Species is a category and element a subtle accent, not a mandate to replace anatomy. Redraws and growth portraits for drawing-born companions reuse the saved original observations. Text-guided generation remains approximate; this is not direct image editing or a guarantee of exact likeness. Existing companions are not reclassified or reset.

The reviewed 0.3.2 remains separate. Live model classification/likeness needs visual evaluation in the test app; automated tests exercise schemas, prompts, persistence and recovery, not model accuracy.
