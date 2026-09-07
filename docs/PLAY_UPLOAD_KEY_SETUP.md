# Google Play upload key setup

This is the one-time signing setup required before GitHub can produce an Android App Bundle (`.aab`) that Google Play Internal testing accepts.

## What this key is

The **upload key** is the private key used by GitHub to sign bundles before uploading them to Google Play. Google Play App Signing then signs the APKs delivered to testers/users with Google's separate app-signing key.

Keep the upload keystore and passwords private. Never commit the keystore or passwords to this repository and never paste them into issues, pull requests, logs, or chat.

## 1. Generate the upload keystore on your own computer

You need Java's `keytool`. Android Studio includes a JDK, or you can use any current JDK.

Run:

```bash
keytool -genkeypair -v \
  -keystore invite-upload.jks \
  -alias invite-upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

When prompted:

- choose a strong keystore password;
- use the same password for the key password if you want the simplest setup;
- the alias must remain `invite-upload`;
- enter your real certificate owner information when prompted.

Back up `invite-upload.jks` in a secure location you control.

## 2. Convert the keystore to Base64 locally

Do not upload the keystore to the public repository.

### macOS

```bash
base64 < invite-upload.jks | tr -d '\n' | pbcopy
```

The Base64 value is now on your clipboard.

### Linux

```bash
base64 -w0 invite-upload.jks
```

Copy the entire output.

### Windows PowerShell

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("invite-upload.jks")) | Set-Clipboard
```

The Base64 value is now on your clipboard.

## 3. Add GitHub Actions repository secrets

Open the repository:

**Settings -> Secrets and variables -> Actions -> Secrets -> New repository secret**

Create exactly these four secrets:

```text
PLAY_UPLOAD_KEYSTORE_BASE64
PLAY_UPLOAD_STORE_PASSWORD
PLAY_UPLOAD_KEY_ALIAS
PLAY_UPLOAD_KEY_PASSWORD
```

Values:

- `PLAY_UPLOAD_KEYSTORE_BASE64`: the Base64 value from step 2
- `PLAY_UPLOAD_STORE_PASSWORD`: the keystore password
- `PLAY_UPLOAD_KEY_ALIAS`: `invite-upload`
- `PLAY_UPLOAD_KEY_PASSWORD`: the key password (same as store password if you chose the simple setup)

Do not create these as repository Variables. They must be **Secrets**.

## 4. Trigger the Firebase Android workflow

After all four secrets exist, run:

**GitHub -> Actions -> Validate Firebase Android -> Run workflow -> branch `impl/firebase-auth`**

The workflow will:

1. validate Firebase staging;
2. build and verify the existing validation APK;
3. reconstruct the upload keystore only inside the ephemeral GitHub runner;
4. configure Gradle release signing;
5. build `app-release.aab`;
6. verify that the AAB is not signed with an Android debug certificate;
7. upload the GitHub artifact named `invite-firebase-play-release-aab`.

If any signing secret is missing, the workflow intentionally skips the Play bundle and says which setup is required instead of producing a misleading debug-signed AAB.

## 5. Upload to Play Internal testing

Download the `invite-firebase-play-release-aab` artifact, unzip it, and upload `app-release.aab` to:

**Play Console -> Invite -> Test and release -> Testing -> Internal testing -> Create/Edit release**

For the first accepted bundle, follow Play's Play App Signing setup. For a new app, letting Google generate the app-signing key is the normal option.

After Play accepts the first bundle, go to:

**Play Console -> Invite -> Test and release / App integrity -> App signing**

Copy the **App signing key certificate SHA-1** (not the upload-key SHA-1) and add it to the Firebase Android app `com.charifmahmoudi.invite`. Then download a fresh `google-services.json` and update the staging branch before relying on Google Sign-In in the Play-installed build.

## Recovery

If the upload key is lost later, Google Play supports upload-key reset while Play App Signing remains intact. Still keep an encrypted backup to avoid operational delays.
