# 1.4.1 · Correct home portrait after reopening

App **1.4.1**, unchanged game tool **0.9.0**. Fixes an interrupted portrait load that could leave the previous companion visible in My home after closing and reopening it.

The home renderer now reuses only a fully decoded portrait for the same companion and image source. Replacing or clearing a portrait immediately clears the previous pixels. Closing the scene or making a newer request invalidates late responses; reopening an interrupted or failed request can load the correct portrait again. Completed portraits remain reusable when the same companion reopens the room.

Two browser regression tests reproduce the old failures and cover interruption/reopening, loading placeholders, missing/failed images, out-of-order responses, same-URL companion changes and successful cache reuse. Existing home purchase, single-AI decoration, undo, save-only retry and mobile tests remain part of validation.

No game rules, tool packages, saved-data schema or AI calls change. The current review candidate **1.0.0** and shared listing are preserved. Deployment evidence will be recorded after installation.
