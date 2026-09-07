# Google Play testing guide

This guide separates three different Google Play testing/release mechanisms so signing certificates are not confused:

1. **Internal App Sharing** — fastest way to install a build through Google Play while development is still active. Accepts APK or AAB signed with any key; Google re-signs it with an Internal App Sharing test certificate.
2. **Internal testing track** — release-like testing track for up to 100 testers. Use an Android App Bundle (`.aab`) signed with the app's upload key. Google Play signs the delivered APKs with the Play App Signing certificate.
3. **Production** — public release. For newer Personal developer accounts, Google Play requires a qualifying closed test before production access.

## Current app identifiers

```text
App name: Invite
Android package: com.charifmahmoudi.invite
Firebase project: invite-someone-app
```

Never put an Android upload keystore, keystore password, OAuth client secret, Firebase service-account key, MongoDB URI, or Firebase ID token in this repository.

## Fastest current route: Internal App Sharing

Use this first when the goal is simply to install and test Invite from Google Play.

### 1. Create the app in Play Console

Open Google Play Console and select **Home -> Create app**.

Use:

```text
App name: Invite
Default language: English (United States), unless another language is intentionally preferred
App or game: App
Free or paid: Free
```

Provide the developer contact email requested by Play Console and accept the required declarations and Play App Signing terms.

Do not create a second app with a different package name. The Android package for Invite is permanently:

```text
com.charifmahmoudi.invite
```

### 2. Upload the current E2E APK to Internal App Sharing

The Firebase Android validation workflow produces:

```text
artifact: invite-firebase-android-e2e
file: app-release.apk
```

In Play Console, select the Invite app, then go to:

**Test and release -> Internal testing -> Internal app sharing**

Upload `app-release.apk`.

Internal App Sharing accepts APK or AAB files signed with any key. Google re-signs the uploaded APK with an Internal App Sharing certificate and generates a download link.

### 3. Copy the Internal App Sharing signing SHA-1

After the first upload, stay in Internal App Sharing and find **Internal test certificate**. Copy the SHA-1 fingerprint.

This certificate is different from the repository validation APK certificate and different from the future Play App Signing production certificate.

### 4. Register the Internal App Sharing SHA-1 with Firebase

Open Firebase Console -> Project settings -> General -> Android app `com.charifmahmoudi.invite` -> **SHA certificate fingerprints**.

Add the Internal App Sharing SHA-1 and save.

Then download a fresh `google-services.json` and replace the repository copy on `impl/firebase-auth`. Do not hand-edit OAuth client entries into the JSON file.

Rebuild the Firebase Android validation APK and upload the new APK to Internal App Sharing again. Google will continue using the same Internal App Sharing test certificate for this app.

This step is required so Google Sign-In works in the Google-re-signed Internal App Sharing build.

### 5. Enable Internal App Sharing on the tester device

On the Android test phone:

1. Open Google Play Store.
2. Open **Settings -> About**.
3. Tap **Play Store version** seven times.
4. Turn on **Internal app sharing** when the option appears.
5. Open the Internal App Sharing download link using the tester Google account.
6. Install Invite from Google Play.

Use this build for Play-delivery smoke testing: installation, launch, Firebase email/password, Google Sign-In, session persistence, password reset, and API/MongoDB behavior.

## Release-like route: Internal testing track

Use this after the Internal App Sharing smoke passes and when the goal is to test the same Play App Signing identity that production users will receive.

### Required build format

Google Play publishing uses Android App Bundles (`.aab`). The bundle must be signed with a dedicated **upload key**. Do not use the repository validation/debug signing key as the permanent upload key.

The upload key must be stored securely outside the public repository. Google Play App Signing should hold the app signing key used for the final APKs delivered to users.

### Internal testing flow

1. Build a signed `.aab` with a secure upload key.
2. Play Console -> **Test and release -> Testing -> Internal testing**.
3. Add tester email addresses.
4. Create a release and upload the `.aab`.
5. Roll out the Internal testing release.
6. Play Console -> **Test and release -> App integrity -> App signing**.
7. Copy the **App signing key certificate SHA-1**.
8. Add that SHA-1 to the Firebase Android app.
9. Download a fresh `google-services.json` and rebuild before relying on Google Sign-In in Play-distributed builds.
10. Test from the Play Store opt-in link.

The Play App Signing SHA-1 is the certificate that matters for Google Sign-In in real Play-distributed builds. The upload-key SHA-1 is not the certificate users receive.

## Personal developer account production rule

Google Play Personal developer accounts created after November 13, 2023 have an additional production-access requirement:

- run a **closed test**;
- at least **12 testers** must remain opted in continuously for **14 days**;
- after meeting the requirement, apply for Production access in Play Console.

This requirement does not block Internal App Sharing or Internal testing.

Google may also require the account owner to verify access to a real Android device in the Play Console mobile app before Production access.

## Certificate matrix

Keep these certificates separate:

| Certificate | Purpose | Register with Firebase for Google Sign-In? |
| --- | --- | --- |
| Repository validation APK SHA-1 | GitHub-built sideload/emulator APK | Yes, for that APK |
| Internal App Sharing SHA-1 | APKs re-signed by Internal App Sharing | Yes, for Internal App Sharing tests |
| Upload key SHA-1 | Authenticates uploads to Play Console | No, not normally the installed app identity |
| Play App Signing SHA-1 | APKs delivered by Play testing/production tracks | Yes, required for Play-distributed Google Sign-In |

## Versioning

For Play track releases, increment Android `versionCode` for each new release. Internal App Sharing can reuse version codes, but Internal testing and Production updates require a greater version code than the previous release.

## Release gates before `main`

Do not promote the Firebase migration to `main` solely because Play accepted an artifact. Require all existing Firebase E2E gates plus:

- Internal App Sharing or Internal testing installation succeeds through Google Play;
- Google Sign-In succeeds under the Google Play signing certificate used by that test mechanism;
- email/password, verification, password reset, session restore and sign-out pass;
- MongoDB provisions exactly one stable Invite member per Firebase identity;
- existing-email collision still returns `ACCOUNT_LINK_REQUIRED`;
- no signing private keys or secrets are committed to GitHub.

## Current provider references

- Google Play internal/closed/open testing: https://support.google.com/googleplay/android-developer/answer/9845334
- Internal App Sharing: https://support.google.com/googleplay/android-developer/answer/9844679
- Play App Signing: https://support.google.com/googleplay/android-developer/answer/9842756
- Personal-account testing requirements: https://support.google.com/googleplay/android-developer/answer/14151465
- Create and set up an app: https://support.google.com/googleplay/android-developer/answer/9859152
