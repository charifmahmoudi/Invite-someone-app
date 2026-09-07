# Firebase operations and mobile testing runbook

This is the operator-facing runbook for Invite's Firebase authentication migration. It explains how to build and install the Android test app, create and verify users, test email/password and Google sign-in, inspect the MongoDB identity mapping, operate the isolated Render environment, diagnose failures, and decide whether a release is safe to promote.

For architecture and trust boundaries, see [FIREBASE_AUTH_SETUP.md](./FIREBASE_AUTH_SETUP.md), [TESTING.md](./TESTING.md), and [ARCHITECTURE.md](./ARCHITECTURE.md).

## Non-negotiable safety rules

- Never use the production Invite API or production MongoDB database for Firebase migration E2E testing.
- Never place a MongoDB URI, password, Firebase service-account private key, OAuth client secret, or Firebase ID token in `EXPO_PUBLIC_*`, GitHub logs, screenshots, issue comments, or documentation.
- Firebase Web config and OAuth client IDs are public client identifiers; Firebase Admin/service-account credentials are not required by the current API verifier.
- Never link an existing Invite account to a Firebase identity by matching email alone. `ACCOUNT_LINK_REQUIRED` is the safe expected result until an explicit proof-of-control linking flow exists.
- Do not switch production to Firebase-only auth while unsupported legacy mobile builds can still reach the API.
- Keep `firebase-hosting/google29a1c742185aaead.html`. Search Console ownership of the Firebase Hosting URL depends on that verification file remaining deployed.

## Current environments

| Environment | Purpose | Git branch | API auth mode | MongoDB database |
| --- | --- | --- | --- | --- |
| Production | Existing users/demo | `main` | internal compatibility auth | `invite_someone` |
| Firebase E2E | Firebase migration testing | `impl/firebase-auth` | `firebase` | `invite_firebase_e2e` |

Firebase E2E API:

```text
https://invite-someone-api-firebase-e2e.onrender.com
```

Firebase project:

```text
Project ID: invite-someone-app
Android package: com.charifmahmoudi.invite
iOS bundle ID: com.charifmahmoudi.invite
```

The E2E service uses a dedicated Atlas database user scoped to the isolated database. Its password and URI must remain in Render/Atlas only.

## What exists when a person is an "Invite user"

There are two identities and they must not be confused:

1. **Firebase Authentication user**: owns the email/password or Google identity and Firebase UID.
2. **Invite member**: owns the Invite profile, activities, invitations and preferences in MongoDB.

MongoDB connects the two with `user_identities`:

```text
provider = firebase
providerSubject = Firebase UID
userId = stable internal Invite member ID
```

A Firebase user can exist before an Invite member exists. Invite intentionally waits for verified email plus profile onboarding before provisioning the MongoDB member.

## Preflight before a phone test

Confirm these items before testing:

1. Firebase Console -> **Security -> Authentication -> Sign-in method**:
   - Email/Password enabled;
   - Google enabled.
2. Google Auth Platform -> **Audience**:
   - User type: External;
   - Publishing status: Testing during development.
3. Google Auth Platform -> **Clients** contains the Web client used by Firebase.
4. For Android Google sign-in, Google Auth Platform -> **Clients** must also contain an Android OAuth client with:

```text
Package: com.charifmahmoudi.invite
SHA-1 for the current E2E APK:
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

That SHA-1 is the development/repository validation signing identity, not the future Google Play signing certificate. When Play App Signing is introduced, register the Play certificate as a separate Android OAuth client/signing identity.

If the Android client is created or changed, download a fresh `google-services.json` for the Firebase Android app, replace the repository copy, and rebuild. Do not hand-edit OAuth client entries into the JSON file.

## Build the Firebase E2E Android APK

The repository has an on-demand workflow named **Validate Firebase Android**.

### From GitHub

1. Open the repository.
2. Open **Actions**.
3. Select **Validate Firebase Android**.
4. Choose **Run workflow**.
5. Select branch `impl/firebase-auth`.
6. Start the workflow.
7. Require every step to pass, especially:
   - `Smoke isolated Firebase API`;
   - `Generate Android project`;
   - `Verify generated Firebase configuration`;
   - `Build Firebase-enabled release APK`;
   - `Verify embedded bundle and signing certificate`.
8. At the bottom of the successful run, download artifact:

```text
invite-firebase-android-e2e
```

The artifact is intentionally short-lived. Build a new one instead of treating an old APK as the release source of truth.

### What the workflow proves

The workflow checks that:

- the isolated API `/health` can reach MongoDB;
- an unauthenticated request to `/v1/me` is rejected with HTTP 401;
- Expo can generate the Android native project;
- Firebase Android config is copied into the generated app;
- the native Google sign-in module compiles;
- a release APK is generated;
- the JavaScript bundle is embedded;
- the APK is signed by the expected E2E signing certificate.

It does **not** prove that a real Firebase user can complete email verification or that Google OAuth is correctly configured in the Google console. Those require the device tests below.

## Install the APK on a physical Android phone

Use a real Android phone for the hosted Firebase smoke because Google Play services, browser/email handoff and persisted sessions matter.

### Option A: install directly on the phone

1. Download the GitHub artifact ZIP.
2. Extract `app-release.apk`.
3. Transfer the APK to the Android phone using a private method you trust.
4. Open the APK on the phone.
5. Android may ask to allow this browser/file manager to install unknown apps. Allow it for this installation only if needed.
6. Install Invite.
7. After installation, revoke the "install unknown apps" permission if you do not normally use it.

### Option B: install with ADB

Enable Developer Options and USB debugging on the phone, connect it to the computer, then run:

```bash
adb devices
adb install -r app-release.apk
```

If an older build with incompatible signing is installed, uninstall that test build first. Uninstalling clears that app's local session/state.

## Recommended test-user creation: create the user in Invite

This is the best test because it exercises the real client flow.

1. Open the Firebase E2E APK.
2. Choose **Create a profile**.
3. Enter a test email inbox you can access and a password with at least 8 characters.
4. Tap **Create account**.
5. Invite calls Firebase `createUserWithEmailAndPassword` and sends a verification email.
6. Leave Invite installed/running and open the verification email.
7. Open the Firebase verification link.
8. Return to Invite.
9. Tap **I've verified my email**.
10. Complete name, city, interests, availability and connection goals.
11. Tap **Create my profile**.

Expected result:

- Firebase has one authenticated user;
- `members` has one Invite member;
- `user_identities` has one `(firebase, Firebase UID) -> Invite userId` mapping;
- the member email matches the verified Firebase email;
- restarting the app restores the same user, not a duplicate profile.

## Add a password user from Firebase Console

Use this when an operator needs a specific test account without going through initial Firebase account creation in the app.

Current Firebase Console path:

1. Open Firebase Console for `invite-someone-app`.
2. Open **Security -> Authentication -> Users**.
3. Click **Add user**.
4. Enter the test email and temporary password.
5. Save.

Important: adding the Firebase user does not create an Invite MongoDB member and should not be followed by a manual Mongo insert.

To finish the normal Invite flow:

1. Open Invite on the phone.
2. Sign in with the Firebase console-created email/password.
3. If the Firebase user is not verified, Invite routes to the verification state.
4. Tap **Resend verification email** if needed.
5. Complete the email link.
6. Return to Invite and tap **I've verified my email**.
7. Complete Invite profile onboarding.

Firebase's current documentation also supports creating password users from **Security -> Authentication -> Users** and sending password-reset email from the Authentication user-management surfaces.

## Verify the MongoDB result

Use Atlas Data Explorer against **only** `invite_firebase_e2e`.

### `members`

Find the user by normalized email. Confirm:

- exactly one member exists;
- `_id` is the stable Invite user ID;
- `emailNormalized` is lowercase;
- profile data matches onboarding.

### `user_identities`

Find the mapping for that member. Confirm:

```text
provider: firebase
providerSubject: <Firebase UID>
userId: <same members._id>
emailVerified: true
```

Never change `providerSubject` manually to make a test pass.

## Expected MongoDB indexes

The isolated environment must have these indexes before E2E data is trusted:

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

Normal maintenance command:

```bash
npm run server:indexes
```

The server also supports `MONGODB_ENSURE_INDEXES_ON_START=true` for an explicit bootstrap deployment. Leave it `false` for normal operation after the indexes are established; the API is intentionally designed not to maintain indexes on every scale-to-zero cold start.

## Email/password release smoke

Run this exact sequence on a physical Android phone:

1. Fresh install or sign out.
2. Create a new account.
3. Confirm verification email arrives.
4. Before clicking the link, confirm Invite does not provision the MongoDB profile.
5. Click verification link.
6. Return to Invite and refresh verification.
7. Complete onboarding.
8. Confirm MongoDB member + identity mapping.
9. Sign out.
10. Sign back in with the same email/password.
11. Confirm the same Invite profile opens.
12. Force-close Invite.
13. Reopen it and confirm the Firebase session is restored.
14. Sign out again and confirm protected Invite data is no longer available.

Pass condition: one Firebase UID always resolves to one stable Invite user ID.

## Password-reset smoke

1. Sign out.
2. Open **Sign in**.
3. Enter the test email.
4. Tap **Forgot password?**.
5. Confirm the app reports that reset instructions were requested without exposing whether an arbitrary account exists.
6. Open the reset email.
7. Set a new password.
8. Sign in with the new password.
9. Confirm the same Invite profile is loaded.

Do not store a real tester password in repository files or screenshots.

## Google Sign-In smoke

Google should be a manual release smoke, not the routine automated CI login path.

1. Verify the Android OAuth client exists for the package + SHA-1 listed above.
2. Install the latest `invite-firebase-android-e2e` APK.
3. Open **Sign in**.
4. Tap **Continue with Google**.
5. Select a Google account that is allowed to use the test OAuth application.
6. Complete any Google consent screen.
7. Invite exchanges the Google ID token for a Firebase credential.
8. For a new identity, complete Invite onboarding.
9. Sign out and repeat Google sign-in.
10. Confirm it returns to the same Invite member.

Common failure:

```text
DEVELOPER_ERROR / configuration error
```

First check the Android OAuth client package name and SHA-1. A successful APK compile alone does not prove this console-side registration.

## Account-collision safety smoke

This test protects legacy users from account takeover by email matching.

1. In an isolated database, create or seed an existing Invite member with an email that is **not** linked to Firebase.
2. Create/verify a Firebase identity using the same email.
3. Attempt Invite provisioning.
4. Expected API result: `ACCOUNT_LINK_REQUIRED`.
5. Confirm no `user_identities` mapping was silently created for the pre-existing member.

Email equality is not proof that both credentials are controlled by the same person.

## Operate the isolated Render Firebase API

Current service:

```text
invite-someone-api-firebase-e2e
branch: impl/firebase-auth
auto deploy: off
AUTH_MODE=firebase
FIREBASE_PROJECT_ID=invite-someone-app
MONGODB_DB_NAME=invite_firebase_e2e
```

A normal staging redeploy is intentional/manual because production-safety is more important than convenience:

1. Confirm branch CI is green.
2. Confirm the desired commit is at `impl/firebase-auth` HEAD.
3. Trigger a Render deploy for `invite-someone-api-firebase-e2e`.
4. Check logs for API startup.
5. Call `/health`.
6. Run the Android validation workflow again so the APK embeds the correct API URL and the hosted API smoke passes.

Do not repoint `invite-someone-api` production to the staging branch.

## Render/Atlas failure diagnosis

### API deploy is live but `/health` fails

`/health` pings MongoDB, so check:

- Atlas access list includes the Render Virginia outbound ranges used by the service;
- MongoDB URI is present only in Render;
- Atlas database user is scoped to the correct E2E database;
- `MONGODB_DB_NAME` is `invite_firebase_e2e`;
- free Atlas cluster is available.

### API returns 401 with a real Firebase login

Check:

- app is pointing at Firebase E2E API, not production;
- `AUTH_MODE=firebase`;
- `FIREBASE_PROJECT_ID=invite-someone-app`;
- token came from the same Firebase project;
- device clock is reasonable;
- Firebase session was refreshed after email verification.

Never log the full ID token while diagnosing.

### API returns `INVITE_PROFILE_REQUIRED`

The Firebase identity is valid but has no Invite profile yet. Complete onboarding.

### API returns `ACCOUNT_LINK_REQUIRED`

This is a security guard, not a database error. Do not bypass it by inserting a mapping manually.

## Clean retest guidance

For ordinary retesting, prefer a new test email rather than modifying identity mappings.

If a test account must be deleted:

1. delete the Firebase Authentication user from **Security -> Authentication -> Users**;
2. identify its Invite `members._id` in `invite_firebase_e2e`;
3. delete only that test member's isolated E2E domain records and `user_identities` mapping;
4. never run equivalent cleanup against `invite_someone` production.

For destructive fixture resets, use a dedicated script/automation with an explicit E2E database guard rather than ad-hoc production-like commands.

## Release acceptance checklist

Do not fast-forward the Firebase migration to `main` until every required item is checked:

- [ ] CI passes on the exact staging SHA.
- [ ] Firebase Android release APK builds on the exact staging SHA.
- [ ] Hosted E2E API health smoke passes.
- [ ] Unauthenticated `/v1/me` returns 401.
- [ ] Required MongoDB indexes exist in the isolated database.
- [ ] Email/password registration passes on a physical phone.
- [ ] Unverified email cannot provision an Invite profile.
- [ ] Email verification + onboarding creates one member and one identity mapping.
- [ ] Returning email/password sign-in restores the same Invite member.
- [ ] Password reset passes.
- [ ] Session survives app restart.
- [ ] Sign-out clears the managed session.
- [ ] Google Sign-In passes on Android.
- [ ] Existing-email collision returns `ACCOUNT_LINK_REQUIRED`.
- [ ] No secrets were added to GitHub, the APK, logs or docs.
- [ ] A compatible production client rollout strategy exists before the production API auth switch.

## Promotion to `main`

This repository's migration workflow uses direct fast-forward promotion, not pull requests.

Promotion should be a fast-forward from the exact validated `impl/firebase-auth` commit to `main`; do not create a merge commit just to promote staging.

After promotion:

1. run CI on `main`;
2. build the production-distribution client with production signing;
3. register the real production Android/Play SHA-1 with Google OAuth;
4. distribute a compatible client before changing the production API to Firebase-only mode;
5. only then change the production Render auth mode as part of an explicit cutover plan.

If old internal-auth binaries can still reach production, do not perform a Firebase-only API switch without a minimum-version gate or a server compatibility/hybrid strategy.

## Useful current provider documentation

These provider pages were rechecked during the September 2026 migration work:

- Firebase manage users: https://firebase.google.com/docs/auth/web/manage-users
- Firebase users/auth lifecycle: https://firebase.google.com/docs/auth/users
- Google Android client authentication/SHA-1: https://developers.google.com/android/guides/client-auth
- Expo APK installation on devices: https://docs.expo.dev/build-reference/apk/

Provider console labels change over time. When a dashboard label differs from this runbook, confirm the current official provider documentation before changing production configuration.
