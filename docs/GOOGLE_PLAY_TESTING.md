# Google Play testing guide

_Last verified: 2026-09-08._

This guide documents Invite's **actual current Google Play path**. The active path is Google Play **Internal testing**, not Internal App Sharing.

For deployment topology and Render/GitHub boundaries, see [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md). For the current blocker and release status, see [CURRENT_STATUS.md](./CURRENT_STATUS.md).

## Current app identifiers

```text
App name: Invite
Android package: com.charifmahmoudi.invite
Firebase project: invite-someone-app
Google Cloud project number: 367720887571
GitHub repository: charifmahmoudi/Invite-someone-app
Play track: internal
Current Android versionCode: 5
```

Never put an Android upload keystore, keystore password, OAuth client secret, Firebase service-account key, MongoDB URI, Firebase ID token, or signing private key in this repository.

## Current Play state

The Internal testing release is already published through the Android Publisher API.

```text
Release: Invite Internal 15
Track: internal
Status: completed
Version code: 5
```

The configured tester list is selected for Internal testing. The tester opt-in page recognizes the tester account, offers **Download test app**, and Google Play displays the unreviewed test build with an **Install** button.

The latest physical-device installation attempt fails only after tapping Install with Google's generic message:

```text
Something went wrong on our end. Please try again.
```

This means tester eligibility and release visibility are working. Do not upload a replacement AAB or bump `versionCode` solely because of this generic installation error.

## Internal testing characteristics

Google Play Internal testing supports up to 100 selected testers and can be used before the app is fully configured for public production. Internal testing is therefore the correct release-like channel for the current Firebase acceptance work.

The public/production review checklist is a separate concern. Internal testing availability does not mean production App content, policy declarations, closed-test requirements, or production access are complete.

## CI publication architecture

`.github/workflows/validate-firebase-android.yml` performs the current release flow:

1. validates the isolated Firebase staging API;
2. runs Expo Android prebuild;
3. verifies `google-services.json` in the generated Android project;
4. builds a staging APK and checks its expected certificate;
5. creates a Play upload-key-signed AAB when signing secrets are configured;
6. verifies the AAB signature and rejects debug signing;
7. authenticates to Google Cloud with GitHub OIDC -> Workload Identity Federation;
8. obtains a short-lived Android Publisher access token;
9. creates a Play edit;
10. uploads the AAB;
11. updates the `internal` track with `completed` status;
12. validates the edit;
13. commits the edit.

Successful publication evidence for the current release:

```text
GitHub Actions run: 34155373675
Version code: 5
Result: Internal testing edit committed successfully
```

## Google Cloud authentication

CI does not store a long-lived Google service-account JSON key.

```text
Service account:
invite-play-ci@invite-someone-app.iam.gserviceaccount.com

Workload Identity Provider:
projects/367720887571/locations/global/workloadIdentityPools/github-actions/providers/github

OAuth scope:
https://www.googleapis.com/auth/androidpublisher
```

The Workload Identity provider is restricted to the Invite repository. Keep the GitHub trust boundary narrow; do not replace this with a downloadable service-account key.

## Play upload signing

The AAB is authenticated to Google Play using a dedicated upload key supplied only through GitHub repository secrets:

```text
PLAY_UPLOAD_KEYSTORE_BASE64
PLAY_UPLOAD_STORE_PASSWORD
PLAY_UPLOAD_KEY_ALIAS
PLAY_UPLOAD_KEY_PASSWORD
```

The workflow writes the keystore only into the ephemeral GitHub runner, injects a generated `playRelease` signing configuration, builds the AAB, and verifies it is not signed with Android Debug credentials.

The upload key is **not** the same certificate used on APKs delivered to users. Google Play App Signing signs the device-delivered APKs.

## Certificate matrix

| Certificate | Purpose | Current SHA-1 | Register with Firebase/Google for Google Sign-In? |
| --- | --- | --- | --- |
| GitHub/test APK | Direct staging APK / emulator validation | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` | Yes, for that APK channel |
| Play upload key | Authenticates AAB upload to Play | `96:55:A1:7E:35:C7:CF:DE:67:BD:3C:E9:6C:F5:22:73:99:F8:06:A3` | Normally no; users do not receive this signer |
| Play App Signing | Signs Play-delivered APKs | `44:A2:72:01:D0:13:DE:A3:79:D1:41:92:67:6C:52:89:20:10:E6:56` | **Yes. Required for Play-delivered Google Sign-In** |

Recorded Play App Signing SHA-256:

```text
31:9F:DF:AD:0E:50:77:AA:FB:46:2C:97:35:2F:5A:BA:15:69:E9:3E:27:C3:48:BF:35:C2:67:D8:36:4E:C4:98
```

These certificate fingerprints are public identifiers. The corresponding private key material must remain private.

## Store listing state

The Android Publisher API-visible listing is currently complete for the required assets used by this test:

- title: present;
- short description: present;
- full description: present;
- public support email: present;
- 512x512 Play Store icon: present;
- 1024x500 feature graphic: present;
- phone screenshots: 2.

The listing update work did not change the AAB, Internal testing track, or Android `versionCode`.

## Screenshot automation

`.github/workflows/play-store-screenshots.yml` publishes real staging-app screenshots rather than fabricated mockups.

The workflow:

1. downloads a previously verified Firebase staging APK artifact;
2. enables `/dev/kvm` on the GitHub-hosted Linux runner;
3. boots an API 35 x86_64 Pixel 6 emulator;
4. installs `com.charifmahmoudi.invite`;
5. tolerates Android-system ANR dialogs without ignoring an Invite app ANR;
6. captures:
   - `01-welcome.png`;
   - `02-discover.png`;
7. validates both images are 1080x2400;
8. retains them as a GitHub Actions artifact;
9. authenticates to Google Play with Workload Identity Federation;
10. replaces the `en-US` phone screenshots through the Android Publisher API;
11. validates and commits the Play edit;
12. opens a fresh temporary edit and verifies Play reports at least two phone screenshots.

Successful run:

```text
Run ID: 34176724947
Result: success
Play phone screenshot count: 2
```

The workflow currently pins a specific verified APK artifact ID. When a new APK becomes the release candidate, update that artifact reference or replace it with commit-aware artifact discovery before refreshing Play screenshots.

## Tester access

Current tester behavior proves the opt-in configuration is functioning:

- tester page reports the account is a tester;
- **Download test app** is visible;
- Play Store opens the Invite test-build page;
- **Install** is visible;
- the app is marked `unreviewed`, which is expected for a test build that has not completed public review.

Do not confuse `unreviewed` with tester ineligibility. Internal testing can serve an app before public production review is complete.

## Diagnosing the current install error

If Play shows the app and Install button but the install ends with **"Something went wrong on our end"**, check these in this order before creating a new release:

1. **Remove differently signed local builds.** If `com.charifmahmoudi.invite` was previously installed from a GitHub APK/ADB, uninstall it completely. A Play App Signing build cannot replace an installed package signed by another certificate.
2. **Restart Play Store state.** Force-stop Google Play Store and clear its cache, then reopen the tester opt-in page.
3. **Allow propagation time.** Internal testing updates can take a short period to become installable everywhere even after the listing becomes visible.
4. **Verify the same Google account.** The tester account used on the opt-in page should be the account active in Play Store.
5. **Check device compatibility only if Play exposes a compatibility message.** Do not infer a manifest/device exclusion problem from the generic Play Store server error alone.
6. **Do not bump versionCode without an upload need.** A listing/install propagation problem is not a version-code collision.

If a new AAB is actually required, then use the next versionCode; Play testing/production track updates require a greater versionCode than the previous uploaded release.

## Play-installed acceptance suite

A successful installation from the Internal testing track is the start of acceptance, not the end.

Run on the Play-delivered build:

- install from Google Play;
- launch;
- email/password signup;
- email verification;
- returning email/password sign-in;
- password reset;
- Google Sign-In under the Play App Signing certificate;
- onboarding/profile provisioning;
- Firebase token -> Express -> MongoDB;
- session persistence after restart;
- logout;
- duplicate login preserves the same Invite identity;
- no duplicate MongoDB member;
- existing-email collision returns `ACCOUNT_LINK_REQUIRED`;
- background/sleep resume;
- network-change behavior;
- uninstall/reinstall or Play update behavior as appropriate.

Production promotion is blocked until this suite passes.

## App content and production review

The Android Publisher API can manage releases, listings, details and listing images, but not every first-publication questionnaire or policy declaration is exposed as an equivalent automated API workflow.

Before closed testing/production submission, recheck the Play Console Dashboard/App content checklist. Depending on Play's current requirements and the app's declared features, this can include items such as:

- privacy policy;
- Data safety;
- app access/reviewer instructions where sign-in is required;
- ads declaration;
- content rating;
- target audience/content;
- other applicable policy declarations.

Do not guess questionnaire answers from code alone when Play asks for a legal/policy declaration. Review the exact current Console question and answer it based on actual application behavior.

## Personal developer account production access

For new Personal developer accounts created after November 13, 2023, Google's current production-access rule requires a **closed test with at least 12 testers continuously opted in for 14 days** before applying for production access.

Internal testing does not satisfy that production-access requirement, although it is the correct channel for the current technical acceptance work.

After the internal acceptance suite passes, create the closed-test plan if this account is subject to that rule and retain real tester feedback/evidence for the production-access application.

## Versioning policy

Current release:

```text
versionCode = 5
```

Rules:

- do not bump for listing metadata changes;
- do not bump for icon/feature-graphic/screenshot changes;
- do not bump for tester-list changes;
- do not bump to retry a Play Store propagation/install glitch;
- bump only when creating and uploading a genuinely new app bundle to a Play track, or if Play reports the exact version-code collision for that new bundle.

## Release gates before `main`

Do not promote Firebase migration code to `main` solely because Play accepted an artifact. Require:

- Play-delivered installation succeeds;
- Google Sign-In succeeds under Play App Signing;
- email/password, verification, password reset, session restore and sign-out pass;
- MongoDB provisions exactly one stable Invite member per Firebase identity;
- existing-email collision still returns `ACCOUNT_LINK_REQUIRED`;
- background/network/reinstall behavior passes the physical-device smoke;
- no signing private keys or secrets are committed;
- exact staging/main/deployed revisions are rechecked before cutover.

## Provider references

Current official references:

- Google Play internal/closed/open testing: https://support.google.com/googleplay/android-developer/answer/9845334
- Prepare and roll out a release: https://support.google.com/googleplay/android-developer/answer/9859348
- Personal-account testing requirements: https://support.google.com/googleplay/android-developer/answer/14151465
- Google Play Developer API: https://developers.google.com/android-publisher/api-ref/rest
- Google Play Developer API setup: https://developers.google.com/android-publisher/getting_started
- Google Cloud Workload Identity Federation: https://cloud.google.com/iam/docs/workload-identity-federation
- GitHub Google Cloud OIDC: https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-google-cloud-platform
