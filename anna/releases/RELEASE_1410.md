# 1.4.10 - home and garden refinement

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


## Home interaction refinement (owner test revision 79)

Source c96d7a2. Landscape-first desktop split pane and mobile stacked shop; Shop/My collection tabs and collection empty state; stored-item summary next to Decorate. Secondary view controls, undo and show-finished are tucked into menus. AI usage details are collapsed. Escape closes browsing before closing home, with focus restored. No gameplay, tool version, data migration or paid AI changes.

Validated 92 JS tests, six real-core home browser scenarios, strict schema validation, and installed source/DOM checks. Owner test 1.4.10/revision 79, cloud tool 0.9.3 loaded/running. Review 1.4.9, descriptions and screenshots unchanged. Game inspection and four app KV records identical before/after. CI 39085768334 / 39085768337 in progress when deployed.


CI follow-up: Anna run 39085768337 failed eight recovery browser scenarios on both platforms due to missing `home.owned` in the isolated mock host, while actual engine responses already supply it. Test-only fix 507e59c adds the required empty list. All eight failure cases pass locally; replacement CI 39086263306 / 39086263232 both succeeded. Windows and Linux each passed 92 JS tests, 118 full browser scenarios, 70 storage/protocol tests, strict validation and standalone executable build/smoke tests. No production asset, working revision, tool package or review changes.


## Authorized review replacement

# 1.4.10 review candidate, description and screenshots - 2026-10-18

The user explicitly requested the latest review candidate with updated description and screenshots. Review is now **1.4.10 / ID 1442 / pending_review**, frozen **tool 0.9.3 / Executa 772 / master ID 1193**. Working revision **79**, unchanged executable bundle, owner installed draft **0.0.0-draft**. Listing/capture source **d1d1237**, UI source **c96d7a2**, test-fixture correction **507e59c**. No public release or web deployment.

- Updated tagline and description for the empty initial yard, 48 objects/36 garden items, Shop/My collection tabs, stored-item count, desktop split view/mobile stacked browsing and secondary controls. Kept exact AI-use boundaries and removed obsolete change-history copy.
- Recaptured ten real UI screenshots from isolated engine views and recorded Mori artwork; published six: care, empty starting yard, redesigned garden shop, drawing editor, dungeon preview, item book. Collection capture retained in Git. All six uploaded CDN images decode at 1280 pixels wide and description/tagline/listing fields exactly match source. No new paid AI, live owner screenshots or production mutations.
- Runtime bundle was already verified in successful Windows/Linux CI **39086263232**: JS **92**, full browser **118**, storage/protocol **70**, strict and executable build/smoke checks; core CI **39086263306** succeeded. Current capture flow and strict validation passed. Later metadata/capture-only CI **39088482080 / 39088482096** is running at record time; no runtime code changed.
- Actual installed app is Connected with no notice; app.js, home.mjs, home.css and home-scene.mjs hashes match source. Cloud **0.9.3 loaded/running**; art/chat/story/personality KV and game inspection unchanged. Working draft dirty_vs_latest_cut=false. PC remains offline/unverified; previously tested Windows package is retained.
- Bundle **1339**, **170 files / 171308544 bytes**, SHA-256 manifest **4a5154cee5b69fabe1c36f3bb1b47d4ed90ff79675c61d40979b9d64f3b0ea5f**. No redundant tool publish or version bump. Next review change still requires fresh user authorization.
