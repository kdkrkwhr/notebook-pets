# Notebuddy — privacy and data notice

Last updated: 10 October 2026. This notice describes Notebuddy 0.2.2. Applies to the Notebuddy app on Anna, maintained by [kdkrkwhr](https://github.com/kdkrkwhr). The separately installed Discord/Hermes edition has a different storage setup.

## What the app stores and why

| Data | Purpose and location |
| --- | --- |
| Companion name, species, element, progress, inventory, daily activity, growth album milestones and recent action results | Saved in your authenticated Anna account’s Notebuddy Game tool storage, to continue your game and prevent repeat rewards. |
| Recent conversation | Up to 24 messages are retained by the app in Anna app storage to show your conversation and provide recent context. This limit does not describe Anna or AI-provider logs. |
| Portrait index and generated portrait files | Saved in Anna app storage and file storage for the growth album. Drawing a replacement changes the displayed portrait; older files are not automatically erased. |
| Language choice | Saved in this browser’s local storage. It is not synced across devices by Notebuddy. |

The app does not request your real name, email, contacts or a separate API key. You choose your companion’s name and anything you type into chat. Avoid entering sensitive personal information. Anna authenticates access to the account’s saved data; Notebuddy’s game commands do not accept another user’s account ID.

## AI processing

When you send a chat message, the app sends up to 12 recent messages, including that message, and a current companion-status snapshot to Anna’s AI service. The snapshot includes the companion’s name and game status. The service uses these to generate a reply. AI replies do not directly award XP or change game statistics.

When you explicitly confirm a new portrait, the app sends a generated description of the companion’s species, element, growth stage and visual style to Anna’s image service. The app does not append your chat transcript to that image prompt. The generated image is downloaded and saved in Anna file storage.

These calls use your Anna AI allowance. Anna routes AI requests to its supported providers. Notebuddy does not promise a particular provider, training policy, processing country or retention period on their behalf. Review the terms presented by Anna for your account before sending information you consider private.

The app contains no separate advertising or analytics service. Anna still handles platform operation, authentication, billing and its own logs; those are outside the app’s storage controls.

## Retention and deletion — current preview

Game records and portraits have no automatic expiry configured by Notebuddy. The recent-chat window is replaced as new messages are saved. Closing the window or changing language does not erase saved data. Uninstalling the app has **not** been verified to erase its app and tool storage.

### Retry saving a conversation

If an AI reply arrives but saving fails, choose **Retry saving conversation**. This retries storage with the same message IDs without another AI call. The app keeps this unsaved exchange in the current window and pauses new chat messages until it is saved. App Refresh and language changes keep the pending exchange; closing or reloading the entire window loses unsaved retry information. No conversation is added to browser local storage for this feature. A confirmed game removal clears pending chat and prevents this client from saving it again.

### Clean unused portraits without ending the game

In the growth album, choose **Clean unused portraits**. Close other Notebuddy windows on every device and stop pending image requests/uploads, then confirm. The app preserves all files referenced by the saved portrait index, including earlier growth stages, and conditionally deletes only unreferenced files within this app’s `portraits/` prefix. It does not change your companion, edit the album index or call AI. Cleanup is unavailable while this window has an unfinished portrait save.

A readable existing album index is required; a missing index is not treated as an empty album. Cleanup stops if the index changes, a file revision conflicts, or storage cannot be checked. Some unused files may already have been removed before an error; rerun after resolving it. Each run reads at most 20 pages of 100 files and refuses deletion if that scan is incomplete. This is a manual maintenance operation, not automatic expiry or a quota guarantee.

There is no atomic transaction between the album index and file deletion. The close-other-windows requirement is necessary: another client or delayed upload can change references after the last check. File ETags do not lock the index. Existing download URLs and platform retention remain separate from app-visible deletion.

### Start over with a new companion

For an active game, choose **Start over** at the bottom of the game screen. After removal, **Start over** is available directly on the ended-game screen. Data removal without a new game remains a separate action under Privacy & data. Enter a new name, close other Notebuddy windows and stop pending requests on every device, check the box, and type **RESET NOTEBUDDY**. Confirmation permanently replaces the old companion and its progress with a new random companion; species and element are both redrawn and may coincidentally match the old ones. The app clears saved chat and all portrait files before releasing the new game. No AI image request is made automatically. Cancel before confirmation changes nothing.

The new companion is staged once, so repeating an interrupted reset with the same reset ID does not reroll it again. If cleanup is interrupted, use **Continue reset**; after reopening, Refresh shows any pending reset. Play is blocked until the cleanup flow finishes. An already-finished reset retry does not clear new progress again. A minimal reset ID and the advancing action sequence remain associated with the game to reject delayed old actions. Neither contains the old companion’s name or chat. Reset is not Anna-account erasure and does not erase platform/provider logs, backups or instantly revoke download URLs.

App records, files and tool state are separate storage operations. Close-other-windows is a necessary precondition, not a global cancellation guarantee: legacy or already-running chat/image writes can arrive later. Missing app rows still have the platform’s unresolved create-if-absent limitation. Game reset uses a conditional write against an existing save; it does not solve concurrent first-ever creation. After removal, you may explicitly choose Start over with a new companion. Deleted records cannot be recovered. A fresh action namespace prevents pre-removal game requests from applying to the new companion; older game adapters refuse the new save format. Close all old windows before restarting.

### Remove an existing saved game

In Notebuddy, open **Privacy & data → Remove my saved data**. Read the confirmation, close other Notebuddy windows on every device and stop pending game/chat/image requests, check the box, and type **DELETE NOTEBUDDY**. Then choose **Remove saved data**. Cancel leaves your data unchanged.

This permanently ends the existing game. Its saved name, progress and action results are replaced by a minimal removal marker. The app then replaces its saved recent chat and portrait index with minimal markers and asks Anna to delete files under this app’s `portraits/` prefix, including replaced portraits. Removal does not automatically start a new game. A later explicit reset can create a new random companion after remaining app data and portrait files are cleared. The markers contain only a removal flag, remain associated with your Anna account’s app/tool storage, and have no expiry configured. They prevent normal requests from recreating the game or conversation until an explicit, confirmed new-companion reset replaces them. The new game retains a random request namespace and reset identifier, not the deleted name or progress.

If cleanup is interrupted, reopen the app and choose **Check and retry data cleanup**. A cleanup error does not mean everything was removed. “Cleanup checked” means the app observed its chat/index markers and an empty portrait file list at that check, not a guarantee about physical erasure or other active clients. Pending uploads and old windows may write afterward: stop them and check again. Already-issued image download links may remain usable until they expire or platform removal takes effect. The browser language preference is cleared after successful cleanup; the current window retains its selected language until closed.

If game progress changed after the confirmation preview, removal is refused: refresh and review the confirmation again. If the result is uncertain, refresh to check whether the game ended and resume cleanup. The app does not offer this removal flow for a missing game save, because Anna’s current APIs do not provide the first-write protection needed for that case. Concurrent initial creation and old in-flight unconditional writes remain known limitations. Complete erasure has not been verified under every concurrent-client scenario.

For cases this flow cannot handle or questions, use [Notebuddy project support](https://github.com/kdkrkwhr/notebook-pets/issues). GitHub issues are public: ask for a private contact route first, without posting your chat, account details, credentials or saved data. A support request is not confirmation of removal and this notice does not promise a response deadline. Requests concerning minimal account-associated markers, other development installations or Anna-account retention need an authenticated platform-supported process.

Anna’s APIs describe storage deletion as soft deletion, and file removal can involve later cleanup. Removing app-visible records is not a promise of immediate physical erasure, revocation of already-issued image URLs, or removal from platform/provider logs and backups. For Anna-account data and platform retention, use Anna’s account/support facilities.

You can separately clear the app’s browser language preference through your browser’s site-data controls. This only removes the local preference; it does not delete your saved companion, conversation or portraits.

## Technical reference

The current app uses tool key `notebuddy/game-v1`, app keys `notebuddy/chat-v1` and `notebuddy/art-v1`, app files under `portraits/`, and browser key `notebuddy/language-v1`. Older development installations may hold separate records. These identifiers help scope a future authenticated deletion request; users should not post their values publicly.

Anna documents the underlying mechanisms in [Persistent Storage](https://anna.partners/developers/reference/executa-persistent-storage.md), [app storage](https://anna.partners/developers/reference/host-api-storage.md) and [app files](https://anna.partners/developers/reference/host-api-files.md). The data practices above describe this app’s current implementation, not a certification of Anna’s compliance or a substitute for Anna’s own policies.
