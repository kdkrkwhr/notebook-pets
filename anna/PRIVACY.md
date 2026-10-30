# Notebuddy — privacy and data notice

Last updated: 30 October 2026. This notice describes the current Notebuddy source; previously submitted versions keep their versioned notices. Applies to the Notebuddy app on Anna, maintained by [kdkrkwhr](https://github.com/kdkrkwhr). The separately installed Discord/Hermes edition has a different storage setup.

## What the app stores and why

| Data | Purpose and location |
| --- | --- |
| Companion name, species, element, progress, inventory, daily activity, growth album milestones and recent action results | Saved in your authenticated Anna account’s Notebuddy Game tool storage, to continue your game and prevent repeat rewards. |
| Recent conversation | Up to 64 chat entries within 40 KB (latest 24 displayed), including care reactions and pending/failure markers, are retained by the app in Anna app storage to show your conversation and provide recent context. This limit does not describe Anna or AI-provider logs. |
| Memory notebook | First meeting, recorded evolutions and first recorded regional guardian victories are retained with game progress. Up to 20 messages you explicitly save are stored separately in the app record `notebuddy/memories-v1`, scoped to the companion ID. Each message retains its original text, role and known timestamp, with a stable deduplication identifier. Limits are 3,000 characters per message and 40,000 UTF-8 bytes for the whole record; new saves exceeding a limit are refused without evicting existing words. |
| Portrait index and generated portrait files | Saved in Anna app storage and file storage for the growth album. Drawing a replacement changes the displayed portrait; older files are not automatically erased. |
| Pixel companion images and source-portrait paths | A 64×64 PNG is prepared locally from a completed portrait or bundled starter and saved in the same private portrait index/file storage for dungeon exploration. No AI request is made for conversion. |
| Dungeon discoveries, daily clears, coins and latest expedition result | Stored with private game progress. Results and charges are committed together before animation; replaying or skipping cannot grant another reward. The latest result remains available across a daily reset until replaced. |
| Normalized reference drawing/photo and extracted visual features | The PNG reference (longest side at most 1024 pixels) and up to 1200 characters of visible features are saved in Anna file/app storage to create the companion and prepare its optional home appearance. Original filenames and source image metadata are not saved by this app. |
| Latest walk story, selected ending and up to 64 recent story request identifiers | Saved in Anna app storage to resume a choice and suppress repeated requests. Starting over or removing saved data clears this record. |
| Language and theme choices | Saved in this browser’s local storage. It is not synced across devices by Notebuddy. |

The app does not request your real name, email, contacts or a separate API key. You choose your companion’s name and anything you type into chat. Avoid entering sensitive personal information. Anna authenticates access to the account’s saved data; Notebuddy’s game commands do not accept another user’s account ID.

## Automatic care reactions

After a successful feed, treat, play, rest, training, walk, battle, walk-away, attendance or quest reward action, the UI queues one short AI reaction. The request includes the pet name, species, element, level, fullness, bond and the actual action outcome (including awarded XP or loot when present). It does not send uploaded artwork or conversation history for this reaction. The reaction uses Anna LLM allowance independently of gameplay, and cannot change rewards or statistics.

A marker is written to the existing chat record before each AI request. An interrupted or failed request is not automatically retried on refresh/reopen, and may still have used allowance. A received but unsaved reply remains in memory for an explicit save-only retry. Markers and replies count toward the existing 64-entry / 40-KB retention limit and are covered by the same reset/removal process. Cross-runtime atomic first-row creation and provider exactly-once billing are not guaranteed.

## Walk stories

A stable subset of peaceful walks requests a short AI story instead of the separate care reaction. Only the companion name, species, element and selected language are sent. The request prepares two choices and both endings at once. Choosing an ending makes no AI or game-action request and awards no XP or items. The latest story is retained until replaced by a later story; up to 64 request identifiers are retained for retry suppression.

A basic story is saved before requesting AI. An unavailable, malformed or interrupted AI response can be completed using that basic story. Reopening never automatically requests another AI story. The same storage first-creation and provider billing limitations described above apply. Reset and removal include the story record. Story generation uses Anna allowance even when the response fails.

## Optional source artwork

You can draw on a 512 by 512 canvas or select a PNG, JPEG or WebP photo/image file (up to 12 MiB and 16 million pixels, at least 32 pixels per side). The browser decodes the image, scales its longest side to at most 1024 pixels, flattens transparency onto white and re-encodes it as PNG. Original filenames and source metadata such as EXIF are not copied. Image content itself can still contain personal information. The file picker and preview stay on your device and do not call AI or upload a file. No drag-and-drop or clipboard-image import is offered.

Choosing Meet or explicitly continuing creation sends that normalized image to Anna's LLM service for an image suitability check and a short description of visible features. This uses your Anna allowance, including when no companion is created. Local format, size and blank-image checks alone do not send an image. People are valid references for stylized human-shaped companions; the model is instructed to focus on the foreground subject, ignore background people and scenery, and avoid identification or sensitive-trait inference. This is an instruction to the model, not an anonymization guarantee. Avoid sensitive information in your reference images.

If the check accepts the source, AI infers a species from its shape and an element from visible colors or motifs. Species interpretations marked uncertain require user confirmation before creation. No element cue means only the element is chosen randomly. The server validates those categories and applies them only on first creation; retries and replacement artwork do not change an existing companion’s traits. The normalized reference and visual description (up to 1200 characters) are saved in Anna app storage. Only the extracted textual features and the confirmed game traits are sent to Anna's image service to generate the baby; the source image URL is not sent to the image generator. The app stores both the reference and generated portrait under its portraits prefix. Failed, replaced or abandoned references may remain until reset or removal; the latest source remains indexed. The app does not promise that its AI check detects every unsuitable input or that a provider deletes submitted content after a refusal. Provider logs, backups and billing remain subject to Anna/provider handling.

The in-browser editor and uncommitted generated image are held in memory. Closing the page may require reselecting unsaved artwork or making another paid generation request. The app does not automatically regenerate an unfinished custom baby when reopened. Choosing the default appearance does not reroll the companion or erase the saved source file. Existing reset/removal covers these source files and descriptions as well as generated portraits. No new file bucket or browser storage key is introduced.


The saved original drawing/photo description is used for the optional home pixel character, prioritizing silhouette, limb count and markings. This is text-guided generation, not a promise of pixel-exact copying or direct image-to-image editing. Random starts still choose both species and element randomly.

## Pixel companions and dungeon exploration

The app prepares a pixel companion after first creation and after a newly saved portrait. This free conversion runs internally for home/dungeon rendering; the growth album does not show a separate pixel preview or preparation button. Conversion downsamples the existing image, simplifies colors and removes near-white pixels connected to its outer border. It does not identify people, infer body parts, generate new poses, or send the image to another AI provider. Portraits with complex or non-white backgrounds may retain some background. The original remains unchanged if conversion or storage fails; a retry makes no AI call.

Derived PNGs and their source paths use the existing `portraits/` prefix and `notebuddy/art-v1` index, separated by companion and growth stage. Reset and data removal include these images. The unused-portrait cleanup button has been removed. Replacing artwork can leave unreferenced files until an explicit reset or data removal. Dungeon maps and automatic movement use bundled code and the saved image, with no per-expedition image-generation request. Dungeon discoveries expire 24 hours after discovery; reward daily limits use midnight Korea time and accumulated coins remain. There is no background/offline auto-farming.

The current tab also keeps a small presentation receipt in session storage (`notebuddy/dungeon-reveals-v1`): companion ID and at most five dungeon ID/expiration pairs. This keeps newly discovered dungeons hidden on the home screen until their outing result is acknowledged and preserves already revealed entries on reload. It does not change game discovery, rewards or expiry. The app clears it when forgetting a removed/reset companion.

## AI processing

### Shared home and dungeon movement images (1.4.8)

On your first home visit for an appearance, you can explicitly choose one AI image request for directional pixel poses or a free default image. Saving a new companion or portrait does not automatically request these poses. The current request reuses saved visible-feature text, the personality's saved appearance description or the game's image prompt, plus growth stage. It does not include chat, the original image file or a reference-image URL. Home and dungeons share the saved result. Purchases, movement and reopening do not invoke pose generation. Earlier failures on the reference-image route may offer the corrected first choice again, but no paid request runs until selected. Equipment is not implemented yet.

The saved sheet, companion ID, growth stage, source-image path and a request reservation are stored in your existing app artwork index and `portraits/` files. Only matching entries are shown. The reservation prevents repeated paid requests for the same artwork after a failure or duplicate save. Failed pose creation does not undo the portrait or game. Reset and data removal include these files. Save retries reuse a received image while the page remains open; closing before saving may lose that temporary result. Missing poses in a dungeon fall back to the current companion's locally converted portrait. Furniture selection uses a separate explicitly requested Decorate call with supplied candidates and saved temperament.

When you send a chat message, the app sends up to 12 recent messages, including that message, and a current companion-status snapshot to Anna’s AI service. The snapshot includes the companion’s name and game status. The service uses these to generate a reply. AI replies do not directly award XP or change game statistics.

When you create a companion from a drawing or photo, the app sends a generated description of the companion’s species, element, growth stage and visual style to Anna’s image service. The app does not append your chat transcript to that image prompt. The generated image is downloaded and saved in Anna file storage.

These calls use your Anna AI allowance. Anna routes AI requests to its supported providers. Notebuddy does not promise a particular provider, training policy, processing country or retention period on their behalf. Review the terms presented by Anna for your account before sending information you consider private.

The app contains no separate advertising or analytics service. Anna still handles platform operation, authentication, billing and its own logs; those are outside the app’s storage controls.

## Retention and deletion — current preview

Game records and portraits have no automatic expiry configured by Notebuddy. The recent-chat window is replaced as new messages are saved. Closing the window or changing language does not erase saved data. Uninstalling the app has **not** been verified to erase its app and tool storage.

### Memory notebook

Saving a completed visible message explicitly keeps a separate copy, independent of the rolling chat window. Removing that copy does not remove or edit the conversation. The saved words are never automatically added to AI prompts. Notebook viewing, saving, deletion and save-only retry make no AI request. A failed save can be retried with the same identifier; retrying does not create a duplicate. Known dates are shown; missing dates and unrecorded past victories are not invented. Reset and data removal include the notebook record and game milestones. Existing records use conditional writes and verify the active companion on each attempt. First-ever row creation retains the platform's existing non-atomic creation limitation.

### Retry saving a conversation

If an AI reply arrives but saving fails, choose **Retry saving conversation**. This retries storage with the same message IDs without another AI call. The app keeps this unsaved exchange in the current window and pauses new chat messages until it is saved. App Refresh and language changes keep the pending exchange; closing or reloading the entire window loses unsaved retry information. No conversation is added to browser local storage for this feature. A confirmed game removal clears pending chat and prevents this client from saving it again.

### Clean unused portraits without ending the game

In the growth album, choose **Clean unused portraits**. Close other Notebuddy windows on every device and stop pending image requests/uploads, then confirm. The app preserves all files referenced by the saved portrait index, including earlier growth stages, and conditionally deletes only unreferenced files within this app’s `portraits/` prefix. It does not change your companion, edit the album index or call AI. Cleanup is unavailable while this window has an unfinished portrait save.

A readable existing album index is required; a missing index is not treated as an empty album. Cleanup stops if the index changes, a file revision conflicts, or storage cannot be checked. Some unused files may already have been removed before an error; rerun after resolving it. Each run reads at most 20 pages of 100 files and refuses deletion if that scan is incomplete. This is a manual maintenance operation, not automatic expiry or a quota guarantee.

There is no atomic transaction between the album index and file deletion. The close-other-windows requirement is necessary: another client or delayed upload can change references after the last check. File ETags do not lock the index. Existing download URLs and platform retention remain separate from app-visible deletion.

### Start over with a new companion

For an active game, choose **Start over** at the bottom of the game screen. After removal, it is available on the ended-game screen. Close other windows and stop pending requests, check the box, and type **RESET NOTEBUDDY**. Confirmation clears the current companion, progress, chat and portraits and returns to the first-meeting screen. Choose the name and a random companion or a drawing/photo there afterward. No new companion or AI image is created by reset itself. Cancel before confirmation changes nothing.

A minimal welcome marker is staged once; repeated reset requests do not create a companion. Legacy clients that explicitly supply a name retain the previous staged-companion behavior. If cleanup is interrupted, use **Continue reset**; after reopening, Refresh shows any pending reset. Play is blocked until the cleanup flow finishes. An already-finished reset retry does not clear new progress again. A minimal reset ID and a fresh action namespace remain associated with the welcome marker and subsequent game to reject delayed old actions. Neither contains the old companion’s name or chat. Reset is not Anna-account erasure and does not erase platform/provider logs, backups or instantly revoke download URLs.

App records, files and tool state are separate storage operations. Close-other-windows is a necessary precondition, not a global cancellation guarantee: legacy or already-running chat/image writes can arrive later. Missing app rows still have the platform’s unresolved create-if-absent limitation. Game reset uses a conditional write against an existing save; it does not solve concurrent first-ever creation. After removal, you may explicitly choose Start over with a new companion. Deleted records cannot be recovered. A fresh action namespace prevents pre-removal game requests from applying to the new companion; older game adapters refuse the new save format. Close all old windows before restarting.

### Remove an existing saved game

In Notebuddy, open **Privacy & data → Remove my saved data**. Read the confirmation, close other Notebuddy windows on every device and stop pending game/chat/image requests, check the box, and type **DELETE NOTEBUDDY**. Then choose **Remove saved data**. Cancel leaves your data unchanged.

This permanently ends the existing game. Its saved name, progress and action results are replaced by a minimal removal marker. The app then replaces its saved recent chat and portrait index with minimal markers and asks Anna to delete files under this app’s `portraits/` prefix, including replaced portraits. Removal does not automatically start a new game. A later explicit reset returns to the first-meeting screen after remaining app data and portrait files are cleared; a new companion is created only when the user completes that screen. The markers contain only a removal flag, remain associated with your Anna account’s app/tool storage, and have no expiry configured. They prevent normal requests from recreating the game or conversation until an explicit, confirmed new-companion reset replaces them. The new game retains a random request namespace and reset identifier, not the deleted name or progress.

If cleanup is interrupted, reopen the app and choose **Check and retry data cleanup**. A cleanup error does not mean everything was removed. “Cleanup checked” means the app observed its chat/index markers and an empty portrait file list at that check, not a guarantee about physical erasure or other active clients. Pending uploads and old windows may write afterward: stop them and check again. Already-issued image download links may remain usable until they expire or platform removal takes effect. The browser language and theme preferences are cleared after successful cleanup; the current window retains its selected language until closed.

If game progress changed after the confirmation preview, removal is refused: refresh and review the confirmation again. If the result is uncertain, refresh to check whether the game ended and resume cleanup. The app does not offer this removal flow for a missing game save, because Anna’s current APIs do not provide the first-write protection needed for that case. Concurrent initial creation and old in-flight unconditional writes remain known limitations. Complete erasure has not been verified under every concurrent-client scenario.

For cases this flow cannot handle or questions, use [Notebuddy project support](https://github.com/kdkrkwhr/notebook-pets/issues). GitHub issues are public: ask for a private contact route first, without posting your chat, account details, credentials or saved data. A support request is not confirmation of removal and this notice does not promise a response deadline. Requests concerning minimal account-associated markers, other development installations or Anna-account retention need an authenticated platform-supported process.

Anna’s APIs describe storage deletion as soft deletion, and file removal can involve later cleanup. Removing app-visible records is not a promise of immediate physical erasure, revocation of already-issued image URLs, or removal from platform/provider logs and backups. For Anna-account data and platform retention, use Anna’s account/support facilities.

You can separately clear the app’s browser language and theme preferences through your browser’s site-data controls. This only removes the local preference; it does not delete your saved companion, conversation or portraits.

## Technical reference

The current app uses tool key `notebuddy/game-v1`, app keys `notebuddy/chat-v1`, `notebuddy/art-v1` and `notebuddy/walk-story-v1`, app files under `portraits/`, browser preference keys `notebuddy/language-v1`, `notebuddy/theme-v1` and `notebuddy/care-ai-v1`, and the tab-scoped `notebuddy/dungeon-reveals-v1` presentation receipt. Older development installations may hold separate records. These identifiers help scope a future authenticated deletion request; users should not post their values publicly.

Anna documents the underlying mechanisms in [Persistent Storage](https://anna.partners/developers/reference/executa-persistent-storage.md), [app storage](https://anna.partners/developers/reference/host-api-storage.md) and [app files](https://anna.partners/developers/reference/host-api-files.md). The data practices above describe this app’s current implementation, not a certification of Anna’s compliance or a substitute for Anna’s own policies.


### Personality and shared experiences / 성격과 함께한 경험

The private game save includes the fictional pet's initial personality (inspired by its name and visual observations), speaking style, harmless habit, and bounded interaction memories. Later actions gradually change its expression. This is fictional characterization, not an assessment of a real person. AI receives these recorded facts for chat, care reactions and walk scenes. Initial personality creation uses Anna AI; an existing custom portrait may also be analyzed when visual observations are unavailable. Refreshing does not automatically retry paid generation. An incomplete personality draft is stored separately and is cleared by the app's reset and data-removal flows.

개인 게임 저장에는 이름·외형 특징에서 만든 가상 펫의 초기 성격, 말투, 작은 습관과 제한된 상호작용 기억이 포함됩니다. 이후 행동이 성격 표현을 조금씩 바꿉니다. 실제 인물의 성격을 판정하는 기능이 아닙니다. 대화·돌봄 반응·산책 장면에 이 기록을 AI 문맥으로 전달합니다. 최초 성격 생성에는 Anna AI를 사용하며, 외형 특징이 없는 기존 개인 그림은 필요할 때 분석합니다. 새로고침은 유료 생성을 자동 재시도하지 않습니다. 미완료 성격 초안도 초기화와 데이터 삭제에 포함됩니다.
