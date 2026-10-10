Latest change: **0.3.1 / tool 0.1.11** adds explicit new-companion restart after removal. Deleted records are not recovered. See [restart behavior](RESTART_AFTER_REMOVAL.md). Older permanent-no-restart descriptions and the 0.3.0 candidate below are historical; deployed 0.2.1 is unchanged.

# Anna submission — 0.3.0

Prepared on 10 October 2026 at the user's request to submit the current implementation.

## Candidate

- App 0.3.0; bundled game tool 0.1.10. Submit the tested matching UI/tool pair.
- English listing, refreshed screenshots and privacy notice pinned to `anna-v0.3.0`.
- Homepage and support use the public GitHub repository/issues. Do not request private data in issues.
- Includes artwork first meeting, automatic care reactions, textual-feature evolution and rechargeable walks.

## Status before upload

Last confirmed review candidate: 0.2.1, version ID 1219, pending_review. Preparing this file is not proof that 0.3.0 was uploaded, cut or submitted. The final server response must be recorded below.

## Remaining verification and accepted limitations

- Actual vision/text image samples and separate persistence checks passed, but full hosted artwork birth and automatic evolution/reopen remain unverified. A local browser PUT failed; previous hosted bundle upload returned WAF 403. See LIVE_VALIDATION_2026_10_10.md.
- A separate ordinary account's installation/first permission grant is unverified; no mobile certification is claimed.
- APS has no verified atomic create-if-absent for simultaneous first creation. Reset/removal cannot promise cancellation of all old in-flight writes or physical erasure of platform/provider logs and backups.
- User authorized proceeding with the current submission; none of these are platform-approved exceptions or evidence of approval.

## Outcome

The official upload attempt on 10 October 2026 was blocked by Anna's WAF: HTTP 403 on `/api/v1/developer/apps/450/working/bundle/file`, uploading `portrait-features.mjs`. Request ID: `a48407618a8dd472-NRT`. The upload announced 88 files and deduplicated 80; finalization did not succeed.

The main working draft is now revision **18**, bundle status **initializing**. Tool 0.1.10 was registered as working configuration, but no new immutable app/tool pair was cut. Listing synchronization occurs after successful bundle upload and was not reached. Server re-query confirmed the old description, three screenshot URLs and release privacy link remain unchanged.

The review remains **pending_review / 0.2.1 / version ID 1219**. No cancellation, new submission, installation or publication occurred. Do not report 0.3.0 as submitted. Retrying the same known WAF rejection or altering content to evade the filter is not a resolution; the platform must permit the normal upload path.

Source preparation commit: `af91469`; source/privacy tag: `anna-v0.3.0`. Local strict manifest validation, 39 UI unit tests, 62 browser tests and 48 storage/protocol tests passed. CI and packaged binary evidence are recorded in the completion note below.

`release` remains on the prior submitted source so the existing review's public privacy URL stays accurate. The new source is merged into `develop`. Once normal uploads work, refresh working revision, upload the matching UI and tool packages, validate the hosted candidate, cut 0.3.0, synchronize listing and repin review. Do not bypass server prechecks.

## Completion evidence

Candidate source `af91469` passed develop CI: core run 38035707653 and Anna Windows/Linux run 38035707613. Both tested 0.1.10 platform archives were downloaded from that exact successful Anna run into the ignored local Executa dist directory. Archive SHA-256 values are retained in the local submission workspace. The version-pinned public privacy URL returned HTTP 200 with the 0.3.0 notice.

The follow-up commit contains documentation only; it does not change the tested UI, rules, manifest, version or screenshots. Upload remains blocked as recorded above; neither a new review candidate nor a 1.0 release is claimed.
