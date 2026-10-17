# 1.4.9 test update

- Removed manual portrait redraw controls, confirmation dialog, generation and retry handlers. Initial drawing/photo birth, saved artwork and the explicit first-home appearance choice remain.
- Owner balance set from 0 to a total of 100 coins using a private backup and conditional write. Full saved-state readback matched; running game tool confirmed 100 coins. No shared reward rules changed.
- Review remains 1.4.8 / ID 1437 / pending_review.

Validation: JS 92, full browser 116, strict passed. Source 60a5257 pushed to release; Anna working revision 74 installed and checked. Controls absent, saved portrait visible, four app KV values unchanged. Installed app.js SHA-256 ca84e281181b8ea8816a9d65a1ea47d4b57d67f1044c5ad95a2d62f9ef94acb7 matches local. Review remains 1.4.8. Owner subsequently spent coins/changed home during this task; later progress preserved.
