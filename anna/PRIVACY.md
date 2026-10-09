# Notebuddy — privacy and data notice

Last updated: 9 October 2026. Applies to the Notebuddy app on Anna, maintained by [kdkrkwhr](https://github.com/kdkrkwhr). The separately installed Discord/Hermes edition has a different storage setup.

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

**A verified complete-deletion flow is not yet available in this private preview.** Do not treat this notice, an uninstall operation or a support request as confirmation that data has been erased. This is a release-readiness item that must be resolved before public release.

For deletion assistance or questions, use [Notebuddy project support](https://github.com/kdkrkwhr/notebook-pets/issues). GitHub issues are public: ask for a private contact route first, without posting your chat, account details, credentials or saved data. The maintainer will need an authenticated, supported Anna deletion route before confirming removal. This notice does not promise a response deadline or deletion completion date.

Anna’s APIs describe storage deletion as soft deletion, and file removal can involve later cleanup. Removing app-visible records is not a promise of immediate physical erasure, revocation of already-issued image URLs, or removal from platform/provider logs and backups. For Anna-account data and platform retention, use Anna’s account/support facilities.

You can separately clear the app’s browser language preference through your browser’s site-data controls. This only removes the local preference; it does not delete your saved companion, conversation or portraits.

## Technical reference

The current app uses tool key `notebuddy/game-v1`, app keys `notebuddy/chat-v1` and `notebuddy/art-v1`, app files under `portraits/`, and browser key `notebuddy/language-v1`. Older development installations may hold separate records. These identifiers help scope a future authenticated deletion request; users should not post their values publicly.

Anna documents the underlying mechanisms in [Persistent Storage](https://anna.partners/developers/reference/executa-persistent-storage.md), [app storage](https://anna.partners/developers/reference/host-api-storage.md) and [app files](https://anna.partners/developers/reference/host-api-files.md). The data practices above describe this app’s current implementation, not a certification of Anna’s compliance or a substitute for Anna’s own policies.
