# 1.4.11 — Choose your evolution

- Evolution is now explicit: meet level and lifetime activity requirements, explore three paths, and choose one. Leveling alone never changes your stage. Existing companions retain their attained stages, identity and progress.
- Growing: Lv.10 + 10 care actions + 3 walks. Mature: Lv.30 + 30 care actions + 10 training + 15 walks. Final: Lv.50 + 60 care actions + 25 training + 30 walks + 3 completed story arcs. Care includes feed, treat, play and sleep; counts are cumulative.
- One bounded AI text/vision request observes the current portrait and personalizes three paths using care, adventures, recent direct chats and the previous evolution memory. The first path preserves the element; the other two offer different elements. Python validates all choices, and AI cannot grant stats, coins or rewards.
- Only the chosen appearance can request one image. Evolution uses visual observations plus the selected direction in a text-to-image prompt, with no image-edit or reference-image request. An image failure keeps the evolution and previous portrait; save recovery never regenerates. Home appearance remains a separate explicit first-visit choice.
- Direct chat history retains up to 64 messages within a 40 KB UTF-8 cap; the conversation panel shows the latest 24. Evolution uses at most 24 recent direct user messages and a 600-character previous evolution summary. This is bounded memory, not a complete transcript archive.
- Shared save schema 5 and Executa 0.9.4. Old schema 2–4 saves migrate without automatic evolution or invented care history. Read-only inspection does not persist migration.

Validation and deployment results are recorded in [HANDOFF.md](../HANDOFF.md). This update targets the owner test app and shared web; review 1.4.10 / 1442 and listing assets remain frozen pending explicit authorization. No paid AI requests are used by the automated validation; actual provider likeness remains variable.
