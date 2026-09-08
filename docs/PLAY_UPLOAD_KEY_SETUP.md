# Google Play upload key setup

_Last verified: 2026-09-08._

This is the one-time signing setup used by GitHub Actions to produce Android App Bundles (`.aab`) accepted by Google Play Internal testing.

The setup is already active for Invite. This document remains as the recovery/audit reference; do not regenerate or replace the current upload key unless there is an explicit operational reason.

## What this key is

The **upload key** is the private key used to sign bundles before they are uploaded to Google Play. Google Play App Signing then signs the APKs delivered to testers/users with Google's separate app-signing key.

These are distinct roles:

```text
Upload key -> proves an upload is authorized
Play App Signing key -> signs APKs actually installed from Google Play
```

Keep the upload keystore and passwords private. Never commit the keystore or passwords to this repository and never paste them into issues, pull requests, logs, documentation, or chat.

## Current Invite signing state

Current public certificate fingerprints:

```text
Play upload SHA-1:
96:55:A1:7E:35:C7:CF:DE:67:BD:3C:E9:6C:F5:22:73:99:F8:06:A3

Play App Signing SHA-1:
44:A2:72:01:D0:13:DE:A3:79:D1:41:92:67:6C:52:89:20:10:E6:56
```

These fingerprints are safe to document. The corresponding private key material is not.

## GitHub Actions secrets

The workflow expects exactly these repository **Secrets**:

```text
PLAY_UPLOAD_KEYSTORE_BASE64
PLAY_UPLOAD_STORE_PASSWORD
PLAY_UPLOAD_KEY_ALIAS
PLAY_UPLOAD_KEY_PASSWORD
```

They must not be repository Variables.

The current workflow checks that all four are present before building a Play AAB. If any are missing, it skips the Play bundle rather than creating a misleading debug-signed release artifact.

## How the workflow uses the key

`.github/workflows/validate-firebase-android.yml`:

1. reconstructs the keystore only inside the ephemeral GitHub runner;
2. injects a generated Gradle `playRelease` signing configuration;
3. builds `app-release.aab`;
4. verifies the AAB with `jarsigner`/`keytool`;
5. rejects Android Debug signing;
6. authenticates to Google Cloud using GitHub OIDC -> Workload Identity Federation;
7. obtains a short-lived Android Publisher token;
8. uploads the AAB to Google Play;
9. assigns it to the Internal testing track;
10. validates and commits the Play edit.

The keystore is not uploaded as a GitHub artifact.

## Current keyless Google Cloud identity

The upload key signs the AAB, but Android Publisher API authentication is separate and keyless:

```text
Service account:
invite-play-ci@invite-someone-app.iam.gserviceaccount.com

Workload Identity Provider:
projects/367720887571/locations/global/workloadIdentityPools/github-actions/providers/github
```

Do not create a long-lived service-account JSON key as a substitute.

## Original key-generation procedure

Use this only if a new/replacement upload key is explicitly required.

On a trusted local computer with Java `keytool`:

```bash
keytool -genkeypair -v \
  -keystore invite-upload.jks \
  -alias invite-upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Choose strong passwords and back up the keystore in a secure location you control.

### Convert to Base64 locally

macOS:

```bash
base64 < invite-upload.jks | tr -d '\n' | pbcopy
```

Linux:

```bash
base64 -w0 invite-upload.jks
```

Windows PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("invite-upload.jks")) | Set-Clipboard
```

Add the Base64 value/passwords as the four GitHub Actions repository Secrets above.

## Do not use manual Play upload as the normal path

The current release path is automated. Do not download the AAB and manually create an Internal testing release unless automation is unavailable and the manual fallback is deliberately chosen.

Normal path:

```text
impl/firebase-auth
-> Validate Firebase Android
-> upload-key-signed AAB
-> GitHub OIDC / Google WIF
-> Android Publisher API
-> Google Play Internal testing
```

Current release evidence:

```text
Internal testing versionCode: 5
Release: Invite Internal 15
Successful publication run: 34155373675
```

## Recovery

If the upload key is lost, Google Play App Signing remains separate. Use Google's upload-key reset process rather than changing the Play App Signing identity.

After a legitimate upload-key reset:

1. store the replacement key securely;
2. replace all four GitHub Actions signing secrets together;
3. verify the new upload certificate fingerprint;
4. run the Android workflow on staging;
5. confirm the AAB signature before allowing the Play API upload;
6. do **not** change the Firebase Android OAuth registration merely because the upload key changed—Google Sign-In for Play-installed builds depends on the Play App Signing certificate.

See [GOOGLE_PLAY_TESTING.md](./GOOGLE_PLAY_TESTING.md) and [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md) for the complete release/signing model.