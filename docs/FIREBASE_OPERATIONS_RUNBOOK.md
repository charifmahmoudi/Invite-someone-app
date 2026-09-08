# Firebase operations and mobile testing runbook

_Last verified: 2026-09-08._

This is the operator-facing runbook for Invite's Firebase migration. It covers the isolated staging environment, Android build/release automation, Google Play Internal testing, Firebase user lifecycle tests, MongoDB identity verification, Render operation, failure diagnosis, and the release decision.

For topology and deployment ownership, see [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md). For Play-specific signing/listing/tester details, see [GOOGLE_PLAY_TESTING.md](./GOOGLE_PLAY_TESTING.md). For current progress, see [CURRENT_STATUS.md](./CURRENT_STATUS.md).

## Non-negotiable safety rules

- Never use the production Invite API or production MongoDB database for Firebase migration E2E testing.
- Never place a MongoDB URI, password, Firebase service-account private key, OAuth client secret, Play upload keystore, signing private key, or Firebase ID token in `EXPO_PUBLIC_*`, GitHub logs, screenshots, issue comments, or documentation.
- Firebase Web config and OAuth client IDs are public identifiers; Firebase Admin/service-account credentials are not required by the current API verifier.
- Never link an existing Invite account to a Firebase identity by matching email alone. `ACCOUNT_LINK_REQUIRED` is the safe expected result until an explicit proof-of-control linking flow exists.
- Do not switch production to Firebase-only auth while unsupported legacy mobile builds can still reach the API.
- Do not bump Android `versionCode 5` to troubleshoot listing metadata, tester propagation, or generic Play Store install errors.
- Keep the production Render service and production database untouched until all Play-delivered acceptance gates pass.

## Current environments

| Environment | Purpose | Git branch | API auth mode | MongoDB database | Render auto deploy |
| --- | --- | --- | --- | --- | --- |
| Production | Existing live path | `main` | compatibility/internal | `invite_someone` | off |
| Firebase staging | Migration/release acceptance | `impl/firebase-auth` | `firebase` | `invite_firebase_e2e` | off |

Firebase staging API:

```text
https://invite-someone-api-firebase-e2e.onrender.com
```

Production API:

```text
https://invite-someone-api.onrender.com
```

Firebase project:

```text
Project ID: invite-someone-app
Project number: 367720887571
Android package: com.charifmahmoudi.invite
iOS bundle ID: com.charifmahmoudi.invite
```

The staging service uses a dedicated Atlas database/user. Its password and URI stay in Render/Atlas only.

## Identity model

There are two identities:

1. **Firebase Authentication user** — owns email/password or Google identity and Firebase UID.
2. **Invite member** — owns Invite profile/domain data in MongoDB.

MongoDB connects the two through `user_identities`:

```text
provider = firebase
providerSubject = Firebase UID
userId = stable internal Invite member ID
```

A Firebase user can exist before an Invite member exists. Invite waits for verified email plus profile onboarding before provisioning a MongoDB member.

## Current Android release source

The release candidate is distributed through Google Play Internal testing.

```text
Track: internal
Release: Invite Internal 15
Android versionCode: 5
Package: com.charifmahmoudi.invite
```

The current tester account is recognized by the opt-in page and Play Store displays the Install button. The remaining installation issue is a generic Play Store error after tapping Install; release visibility itself is working.

## Build and publish the Firebase Android candidate

Use the GitHub Actions workflow **Validate Firebase Android** on `impl/firebase-auth`.

It must pass:

- staging API health/unauthenticated smoke;
- Expo prebuild;
- generated Firebase configuration check;
- Firebase staging APK build;
- APK embedded-bundle/signing verification;
- Play upload-signing-secret availability;
- upload-key-signed AAB build;
- AAB signature verification;
- Google Cloud Workload Identity authentication;
- Android Publisher AAB upload;
- Internal track update;
- Play edit validation and commit.

Current successful Internal testing publication evidence:

```text
GitHub Actions run: 34155373675
Version code: 5
```

Do not treat the GitHub APK and Play-delivered APK as the same signing identity. Google Play re-signs device-delivered APKs with Play App Signing.

## Signing preflight for Google Sign-In

Current known SHA-1 fingerprints:

```text
GitHub/test APK:
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25

Play upload key:
96:55:A1:7E:35:C7:CF:DE:67:BD:3C:E9:6C:F5:22:73:99:F8:06:A3

Play App Signing:
44:A2:72:01:D0:13:DE:A3:79:D1:41:92:67:6C:52:89:20:10:E6:56
```

For a build installed from Google Play, Google Sign-In depends on the Android OAuth client registered for package `com.charifmahmoudi.invite` plus the **Play App Signing SHA-1**.

If Google Sign-In reports `DEVELOPER_ERROR`, `ApiException: 10`, or another configuration error, check package/SHA-1 registration before changing application code.

## Preflight the Firebase staging API

Before a device acceptance run:

```bash
curl -fsS https://invite-someone-api-firebase-e2e.onrender.com/health
```

Expected response includes a healthy status. Also verify an unauthenticated call is rejected:

```bash
curl -sS -o /tmp/invite-me.json -w '%{http_code}\n' \
  https://invite-someone-api-firebase-e2e.onrender.com/v1/me
```

Expected HTTP status: `401`.

Never paste a live Firebase ID token into shell history or documentation.

## MongoDB schema gate

The isolated `invite_firebase_e2e` database must have the canonical indexes:

```text
members
  emailNormalized_1                     unique
  mapPoint_2dsphere                     sparse
  profile.interests_1

user_identities
  identity_provider_subject_unique      unique(provider, providerSubject)
  identity_user                         userId

activities
  startAt_1
  hostId_1_startAt_1

invitations
  activeKey_1                           unique + sparse
  receiverId_1_createdAt_-1
  senderId_1_createdAt_-1

saved_activities
  userId_1_activityId_1                 unique
```

Normal maintenance:

```bash
npm run server:indexes
```

`MONGODB_ENSURE_INDEXES_ON_START=true` is only for controlled bootstrap. Return it to `false` after indexes are established.

## Emulator preflight

A local or CI emulator is useful before physical release acceptance. The GitHub **Play Store Screenshots** workflow proves the verified staging APK can boot on an API 35 Pixel 6 emulator with KVM and captures real app screens.

The screenshot workflow is not a substitute for Play-installed acceptance because it installs the staging APK directly, not the Play App Signing build.

For local emulator checks, use a Google-Play-enabled Android Virtual Device when testing Google Sign-In. Direct APK installation is acceptable for preflight only:

```bash
adb uninstall com.charifmahmoudi.invite || true
adb install app-release.apk
```

## Google Play tester installation

Use the configured tester Google account.

1. Open the Invite internal-test opt-in page.
2. Confirm the page says the account is a tester.
3. Tap **Download test app**.
4. Confirm Google Play opens the Invite test-build page.
5. Tap **Install**.

### If Install returns "Something went wrong on our end"

Before uploading anything new:

1. Check Settings -> Apps for an existing Invite installation.
2. If `com.charifmahmoudi.invite` was previously installed from a GitHub APK/ADB, uninstall it completely. A differently signed local build cannot be updated in place by Play App Signing.
3. Force-stop Google Play Store.
4. Clear **Play Store cache**.
5. Reopen the opt-in page and retry.
6. Confirm the same tester Google account is active in the Play Store.
7. Allow normal Play propagation time and retry later if the release was just changed.

Do **not** bump `versionCode 5` or upload a replacement AAB unless a genuinely new binary is required or Play reports a specific version-code collision.

## Play-installed acceptance suite

Once Play installation succeeds, run the following on that exact Play-delivered build.

### 1. Launch

- App starts without crash/ANR.
- Welcome/auth UI is rendered correctly.
- App is pointing to the Firebase staging API, not production.

### 2. Email/password registration

1. Create a new account using a dedicated test inbox.
2. Confirm the verification email arrives.
3. Before verification, attempt provisioning.
4. Expected: no Invite MongoDB profile is created and verified-email enforcement remains active.
5. Complete the verification link.
6. Return to Invite and refresh verification state.
7. Complete onboarding/profile creation.

Expected MongoDB result:

- exactly one `members` record;
- exactly one `user_identities` record;
- `provider=firebase`;
- `providerSubject=<Firebase UID>`;
- `emailVerified=true`;
- mapping `userId` equals the member `_id`.

### 3. Returning email/password sign-in

1. Sign out.
2. Sign in with the same email/password.
3. Confirm the same Invite profile loads.
4. Confirm no duplicate member or identity mapping is created.

### 4. Password reset

1. Sign out.
2. Request password reset from Invite.
3. Complete the Firebase reset email/browser flow.
4. Sign in with the new password.
5. Confirm the same Invite member is restored.

### 5. Google Sign-In

1. Sign out.
2. Tap **Continue with Google**.
3. Use the real Android account chooser.
4. For a new Google identity, complete onboarding.
5. Sign out and repeat Google Sign-In.
6. Confirm the same Invite member returns and no duplicate record is created.

This proves the OAuth configuration for the **Play App Signing** certificate, which emulator/direct-APK testing cannot prove by itself.

### 6. Session persistence

1. Sign in.
2. Force-close Invite or swipe it away.
3. Reopen it.
4. Confirm the Firebase session restores and the same Invite member loads.

Then background/sleep the device and resume. The app must recover without corrupting the authenticated state.

### 7. Logout

- Sign out.
- Protected Invite data must no longer be available.
- Firebase session is cleared.
- Native Google session is cleared as expected.

### 8. Existing-email collision

In the isolated database only:

1. create/seed an Invite member with an email not linked to Firebase;
2. create and verify a Firebase identity using that same email;
3. attempt provisioning;
4. expected result: `ACCOUNT_LINK_REQUIRED`;
5. confirm no identity mapping was silently added.

Never bypass this test by manually inserting `user_identities`.

### 9. Network behavior

- Background Invite.
- Change Wi-Fi/mobile connectivity as appropriate.
- Reopen Invite.
- Confirm transient network failure is handled sensibly and the identity mapping/session is not corrupted.

### 10. Reinstall/update behavior

As appropriate for the release candidate:

- uninstall and reinstall from Internal testing; or
- test the next Play update when a new versionCode is intentionally created.

After reinstall, authenticate again and confirm the existing Invite identity is restored rather than duplicated.

## Verify MongoDB results

Use Atlas Data Explorer against **only** `invite_firebase_e2e`.

### `members`

For each acceptance identity, confirm:

- one member only;
- stable `_id`;
- normalized lowercase email;
- expected onboarding/profile data.

### `user_identities`

Confirm:

```text
provider: firebase
providerSubject: <Firebase UID>
userId: <same members._id>
emailVerified: true
```

Never change `providerSubject` manually to make a test pass.

## Operate the isolated Render Firebase API

Current service:

```text
name: invite-someone-api-firebase-e2e
branch: impl/firebase-auth
auto deploy: off
runtime: Node
region: Virginia
build: npm ci
start: npm run server:start
AUTH_MODE=firebase
FIREBASE_PROJECT_ID=invite-someone-app
MONGODB_DB_NAME=invite_firebase_e2e
```

Because auto-deploy is off, updating the branch does not deploy the API.

A staging backend deployment should be deliberate:

1. confirm CI is green;
2. identify the exact backend commit intended for deployment;
3. trigger Render deploy for `invite-someone-api-firebase-e2e` only;
4. wait for live status;
5. verify `/health`;
6. rerun hosted/API smoke if backend behavior changed;
7. rebuild/publish Android only if the client binary actually needs to change.

Do not repoint or modify `invite-someone-api` production during staging acceptance.

## Render/Atlas diagnosis

### `/health` fails

Check:

- Atlas network access permits Render;
- staging MongoDB URI remains in Render only;
- database user is scoped correctly;
- `MONGODB_DB_NAME=invite_firebase_e2e`;
- Atlas cluster is available.

### API returns 401 with a real Firebase login

Check:

- client points to staging API;
- staging Render has `AUTH_MODE=firebase`;
- `FIREBASE_PROJECT_ID=invite-someone-app`;
- token came from the same Firebase project;
- device clock is reasonable;
- Firebase session refreshed after email verification.

Never log the full token.

### API returns `INVITE_PROFILE_REQUIRED`

The Firebase identity is valid but has no Invite profile yet. Complete onboarding.

### API returns `ACCOUNT_LINK_REQUIRED`

This is the intended security guard. Do not bypass it.

## Clean retest guidance

Prefer a new test email for ordinary retesting.

If a test identity must be removed:

1. delete the Firebase Authentication test user;
2. identify its Invite member in `invite_firebase_e2e`;
3. remove only that isolated test member's domain records and `user_identities` mapping;
4. never perform equivalent cleanup against production `invite_someone`.

For destructive fixture resets, use a guarded E2E script rather than ad-hoc production-like commands.

## Release acceptance checklist

Do not fast-forward to `main` until every required item is checked:

- [ ] CI passes for the exact accepted staging code.
- [ ] Hosted Firebase/API boundary smoke passes.
- [ ] Required MongoDB indexes exist in `invite_firebase_e2e`.
- [ ] AAB is signed with the protected Play upload key and accepted by Internal testing.
- [ ] Google Play tester opt-in works.
- [ ] Play installation succeeds on the physical tester device.
- [ ] Email/password registration succeeds from the Play-installed build.
- [ ] Unverified email cannot provision an Invite profile.
- [ ] Verification + onboarding creates one member and one identity mapping.
- [ ] Returning email/password sign-in restores the same Invite member.
- [ ] Password reset succeeds.
- [ ] Google Sign-In succeeds under Play App Signing.
- [ ] Session survives restart/background/sleep.
- [ ] Sign-out clears managed sessions.
- [ ] Existing-email collision returns `ACCOUNT_LINK_REQUIRED`.
- [ ] Network-change behavior is acceptable.
- [ ] Reinstall/update behavior preserves identity correctness.
- [ ] No secrets were added to GitHub, APK/AAB, logs, screenshots or docs.
- [ ] Play Console production/App content requirements have been reviewed separately.
- [ ] A compatible production client rollout strategy exists before the production API auth switch.

## Promotion to `main`

Promotion uses direct fast-forward, not a PR/merge commit.

After acceptance:

1. recheck `impl/firebase-auth` and `main` heads;
2. ensure the accepted functional changes are exactly what will be promoted;
3. fast-forward `main` if possible;
4. run CI on `main`;
5. build/distribute the compatible production client;
6. confirm the production Render deployment and `/health`;
7. only then switch production auth mode as part of an explicit cutover plan.

If old internal-auth binaries can still reach production, do not perform a Firebase-only switch without a minimum-version gate or a temporary server compatibility strategy.

## Production rollback principle

Before production cutover, the safest rollback is simply not to promote staging.

After a future cutover, restore a known-good compatible client/server pair. Never "fix" an auth incident by silently creating identity mappings from matching emails.
