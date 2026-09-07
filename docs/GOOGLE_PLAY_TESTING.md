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
Google Cloud project number: 367720887571
GitHub repository: charifmahmoudi/Invite-someone-app
```

Never put an Android upload keystore, keystore password, OAuth client secret, Firebase service-account key, MongoDB URI, Firebase ID token, or Google Cloud service-account JSON key in this repository.

## Fastest current route: Internal App Sharing

Use this first when the goal is simply to install and test Invite from Google Play.

### 1. Play app

The Invite app already exists in the current Play Console account. Do not create another Play app for this package.

The Android package is permanently:

```text
com.charifmahmoudi.invite
```

### 2. GitHub build artifacts

The Firebase Android validation workflow produces:

```text
artifact: invite-firebase-android-e2e
file: app-release.apk

artifact: invite-firebase-play-test-aab
file: app-release.aab
```

Prefer `invite-firebase-play-test-aab` for Google Play testing because `.aab` is the same distribution format used by Play testing tracks and production.

The AAB produced here is only for **Internal App Sharing**. It intentionally uses the repository validation signing identity. Do not treat that signing identity as the permanent Google Play upload key.

## Automatic Internal App Sharing from GitHub

The Firebase Android validation workflow can upload `app-release.aab` directly to Google Play Internal App Sharing after the build and validation gates pass.

The upload uses the Google Play Developer API `internalappsharingartifacts.uploadbundle` endpoint. A successful upload adds the Play installation URL, Internal App Sharing certificate SHA-256, and uploaded artifact SHA-256 to the GitHub Actions job summary.

Authentication uses **GitHub OIDC -> Google Cloud Workload Identity Federation -> service-account impersonation**. No long-lived service-account JSON key is stored in GitHub.

The workflow is guarded by this repository variable:

```text
GOOGLE_PLAY_CICD_ENABLED=true
```

Until that variable is set, Android validation still runs and produces APK/AAB artifacts, but the Google Play upload step is skipped.

### One-time Google Cloud bootstrap

Use Google Cloud Shell while the active project is `invite-someone-app`.

```bash
set -euo pipefail

PROJECT_ID="invite-someone-app"
PROJECT_NUMBER="367720887571"
REPO="charifmahmoudi/Invite-someone-app"
POOL_ID="github-play"
PROVIDER_ID="invite-repo"
SERVICE_ACCOUNT_NAME="invite-play-ci"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# APIs required by the Play Publisher call and service-account impersonation.
gcloud services enable \
  androidpublisher.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  --project="$PROJECT_ID"

# Dedicated CI identity. Do not create or download a service-account key.
gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
  --project="$PROJECT_ID" \
  --display-name="Invite Google Play CI"

# GitHub OIDC trust pool.
gcloud iam workload-identity-pools create "$POOL_ID" \
  --project="$PROJECT_ID" \
  --location="global" \
  --display-name="GitHub Actions Play"

# Trust only this repository and the Firebase staging branch.
gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="$POOL_ID" \
  --display-name="Invite repository" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --attribute-condition="assertion.repository=='${REPO}' && assertion.ref=='refs/heads/impl/firebase-auth'"

POOL_NAME="$(gcloud iam workload-identity-pools describe "$POOL_ID" \
  --project="$PROJECT_ID" \
  --location="global" \
  --format="value(name)")"

gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_NAME}/attribute.repository/${REPO}"

printf 'Service account: %s\n' "$SERVICE_ACCOUNT_EMAIL"
gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="$POOL_ID" \
  --format="value(name)"
```

Expected identities used by the checked-in workflow:

```text
Service account:
invite-play-ci@invite-someone-app.iam.gserviceaccount.com

Workload Identity Provider:
projects/367720887571/locations/global/workloadIdentityPools/github-play/providers/invite-repo
```

If any resource already exists, inspect it instead of deleting/recreating it blindly. The provider must remain restricted to `charifmahmoudi/Invite-someone-app` and `refs/heads/impl/firebase-auth` while this migration is staged.

### One-time Play Console permission

Open **Play Console -> Users and permissions -> Invite new users** and invite:

```text
invite-play-ci@invite-someone-app.iam.gserviceaccount.com
```

Give the service account access to the **Invite** app only. Grant the minimum release permission:

```text
Release apps to testing tracks
```

If Play Console requires the read permission as a prerequisite, also grant:

```text
View app information (read-only)
```

Do not grant production release, financial, order, admin, or account-management permissions.

Google documents that `Release apps to testing tracks` authorizes Internal App Sharing uploads.

### Enable the GitHub upload gate

After Google Cloud federation and Play Console permissions are complete, open:

**GitHub repository -> Settings -> Secrets and variables -> Actions -> Variables**

Create this repository variable:

```text
Name: GOOGLE_PLAY_CICD_ENABLED
Value: true
```

This is a non-secret feature flag. No Google private key is required in GitHub Secrets.

After the variable is enabled, trigger a fresh Firebase Android validation run. Every successful eligible run will then:

1. validate the isolated Firebase API;
2. generate the native Android project;
3. verify Firebase configuration;
4. build the APK and AAB;
5. verify signing/configuration;
6. keep the APK/AAB as GitHub artifacts;
7. obtain a short-lived Google access token via GitHub OIDC;
8. upload the AAB to Internal App Sharing;
9. print the Google Play install link in the GitHub Actions run summary.

### First automatic upload: register Google's Internal App Sharing certificate

After the first successful automatic upload, open:

**Play Console -> Invite -> Test and release -> Internal testing -> Internal app sharing -> Uploaders and testers**

Find **Internal test certificate** and copy its **SHA-1** fingerprint.

The Google Play API response exposes the certificate SHA-256, but Firebase Android Google Sign-In needs the SHA-1 registration as well. Add the SHA-1 to:

**Firebase Console -> Project settings -> General -> Android app `com.charifmahmoudi.invite` -> SHA certificate fingerprints**

Then download a fresh `google-services.json`, update `impl/firebase-auth`, and rebuild. Google will continue using the same Internal App Sharing certificate for the app.

This is a one-time certificate bootstrap for Internal App Sharing Google Sign-In.

### Tester device

On the Android test phone:

1. Open Google Play Store.
2. Open **Settings -> About**.
3. Tap **Play Store version** seven times.
4. Turn on **Internal app sharing** when the option appears.
5. Open the installation link from the successful GitHub Actions summary.
6. Install Invite from Google Play.

Play Console can allow anyone with the link or restrict downloaders to an email list. Prefer a restricted tester list if additional people are involved.

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
| Internal App Sharing SHA-1 | Artifacts re-signed by Internal App Sharing | Yes, for Internal App Sharing tests |
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
- Google Play Developer API: https://developers.google.com/android-publisher/api-ref/rest
- Google Play Developer API setup: https://developers.google.com/android-publisher/getting_started
- Google Cloud Workload Identity Federation: https://cloud.google.com/iam/docs/workload-identity-federation
- GitHub Google Cloud OIDC: https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-google-cloud-platform
