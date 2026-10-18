# 1.4.10 - empty starting garden

Source 7037da7, game tool 0.9.3. Deployed to owner test app: **working revision 78 / installed 0.0.0-draft**, tool **0.9.3 / Executa 772** loaded/running.

- Removed all default outdoor trees, bushes, bench, separate pots and wildflower clusters. Only the cottage, fence, paths and lawn remain. Cottage artwork is unchanged.
- Owned/purchased objects still render from the saved layout. No ownership, money, pet, artwork or conversation migration is performed. New geometry also frees the previously occupied planting pockets for validated future decorations.
- The initially proposed sparse two-tree variant at 7740a1d was superseded before deployment, following the user's request for no default decorations.
- No paid AI calls. Review 1.4.9 / ID 1439 and its listing/screenshots must remain unchanged; this is a test-app update only.
- Local validation: 11 home/geometry tests, 92 JS tests, five real-core home browser tests, strict validation. A private initial-state preview shows the empty yard. Core CI 39084579106 passed; Windows/Linux packaging run 39084579116 passed on both platforms.

## Installed verification

# 1.4.10 empty starting yard - 2026-10-18

Source **7037da7**, owner test app **1.4.10 / working revision 78 / installed 0.0.0-draft**, actual cloud tool **0.9.3 / Executa 772 / ID 1193 loaded/running**. The user clarified that all default trees and decorations should be absent. Kept the cottage/fence/paths/lawn and existing owned objects; removed all separate default trees, bushes, bench, pots and flower clusters. Cottage artwork is preserved. The earlier sparse two-tree variant was never deployed.

- Home/geometry tests **11**, JS **92**, real-core home browser **5**, strict passed locally. Core CI **39084579106** and both Windows/Linux jobs in **39084579116** passed, including full browser/protocol checks and packaged executable smoke tests.
- Explicitly published both tested 0.9.3 binary artifacts, then used scoped cloud tool reinstall and restored the source storage declaration. Installed the working UI. Actual world default object list is exactly **house**; existing purchased objects still render. Current home-scene.mjs SHA-256 **770b5ff307ae4604485cb450d9fb615cfeea2a3153a2ef3087f5a5e031cb5fcd** matches the installed file. Connected, no error notice.
- Private pre/post game value and ETag are identical. Art/chat/walk-story/personality KV all identical. No game migration, paid AI or production purchase calls.
- Review **1.4.9 / ID 1439 / pending_review**, tagline/description, all six screenshot URLs and shared listing fields verified unchanged. No app cut, review submission or public web deployment. PC host remains unverified/offline as previously recorded; Windows package is CI-tested and uploaded.


| Package | SHA-256 |
| --- | --- |
| linux x86_64 | `06fa381d3c44f1301644a7f9bb87ab66c8f1d9fa1cdcc82ebf9b7af1fb7437b0` |
| windows x86_64 | `ec05aeeb42e3ef0023ad35e02c58863fa616c35e21e7d55c7ac62f1fc24207e5` |
