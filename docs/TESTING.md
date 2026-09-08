# Testing strategy

_Last verified: 2026-09-08._

This document defines **what each test layer must prove**. For current progress, see [CURRENT_STATUS.md](./CURRENT_STATUS.md). For exact operator steps, use [FIREBASE_OPERATIONS_RUNBOOK.md](./FIREBASE_OPERATIONS_RUNBOOK.md). For environment and deployment boundaries, use [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md).

## Test layers

```text
Play-delivered physical acceptance      final release gate
Native/emulator preflight               fast Android behavior
Hosted Firebase/API boundary smoke      real provider trust boundary
MongoDB/API integration                 authorization + identity invariants
Domain/unit/component tests             business rules
TypeScript/lint/build gates              fast static/packaging checks
```

No single layer proves native behavior, provider configuration, Play signing, authorization and MongoDB correctness at once.

## Standard CI gates

The `CI` workflow runs on `main`, `impl/**`, pull requests and manual dispatch:

```bash
npm ci
npm run typecheck
npm run lint
npm run test:ci
npm run export:web -- --output-dir dist
```

It proves TypeScript correctness, lint/React Compiler rules, domain/user-story tests and production web exportability.

## Firebase staging workflows

### Firebase Hosted Auth Smoke

Creates a disposable real Firebase password user, obtains a genuine Firebase ID token, proves the isolated Express API accepts it, proves an unverified user cannot provision MongoDB state, and removes the test user.

This validates the real Firebase -> Express trust boundary without an Invite auth bypass.

### Validate Firebase Android

This is both a native validation workflow and the current Internal testing release workflow. It:

- checks the isolated staging API;
- runs Expo Android prebuild;
- verifies generated Firebase configuration;
- builds the Firebase staging APK;
- verifies its embedded JS bundle and staging signing certificate;
- builds a protected upload-key-signed AAB when signing secrets are present;
- rejects debug-signed AABs;
- authenticates to Google Cloud through Workload Identity Federation;
- uploads/releases the AAB to Google Play Internal testing;
- validates and commits the Play edit.

Current Internal testing version: `versionCode 5`.

### Play Store Screenshots

This workflow exists to produce truthful Play listing evidence from the real staging app. It:

- downloads a verified staging APK;
- enables KVM on the GitHub Linux runner;
- boots an API 35 Pixel 6 emulator;
- installs and launches Invite;
- handles non-Invite Android system ANR dialogs without ignoring Invite ANRs;
- captures real welcome/discovery screenshots;
- uploads the screenshots as CI evidence;
- publishes them to Google Play;
- verifies the Play listing contains at least two phone screenshots.

Latest verified successful run: `34176724947`.

The screenshot workflow proves renderability and listing assets. It does **not** prove the Play App Signing build can install or authenticate on a physical tester device because the emulator installs the staging APK directly.

## Domain and component coverage

Fast tests cover registration/profile/activity validation, matching and discovery logic, reducer behavior, invitation state transitions, capacity rules and saved activities.

These tests do not replace server authorization or hosted Firebase testing.

## API integration requirements

The MongoDB-backed API suite should cover:

- protected endpoints reject unauthenticated requests;
- malformed, expired, wrong-audience, wrong-issuer and unknown-key Firebase tokens fail;
- a valid Firebase UID can resolve only its mapped Invite user;
- an unmapped Firebase identity receives `INVITE_PROFILE_REQUIRED` where appropriate;
- provisioning requires a verified email;
- matching email alone cannot claim an existing Invite account;
- member/host/receiver/sender permissions are enforced;
- invite-only/private data is not leaked;
- simultaneous capacity-sensitive writes remain transactionally correct;
- invitation acceptance and attendee insertion roll back together;
- saved activities stay private;
- public profiles do not expose email/auth fields;
- geospatial queries honor their distance bounds.

Do not introduce an auth bypass just to make E2E easier.

## Android emulator strategy

Use emulator tests for fast preflight and repeatable UI/native checks.

Every emulator acceptance run must reset the isolated dataset through the guarded fixture boundary described in [E2E_FIXTURES.md](./E2E_FIXTURES.md). The boundary is disabled by default, requires a dedicated `e2e`/`test` database name and protected token, and cannot target the production API URL.

Google Sign-In preflight requires an emulator image with Google Play services. A direct staging APK can validate the repository/test signing OAuth registration, but it cannot prove Play App Signing OAuth registration.

The CI screenshot emulator currently uses:

```text
API level: 35
architecture: x86_64
profile: Pixel 6
hardware acceleration: /dev/kvm
```

Emulator acceptance is useful for:

- app startup/rendering;
- email/password UI;
- verification state handling;
- onboarding/profile UI;
- session restore logic;
- logout;
- staging API/MongoDB behavior;
- direct-APK Google Sign-In preflight.

It is no longer the final release gate once a Play Internal testing release exists.

## Play-delivered physical-device acceptance

The final Android release gate must run from the **Google Play Internal testing install**, because only that proves:

- Play track/tester delivery;
- Play App Signing install identity;
- Play-signed Google OAuth registration;
- real Android account chooser behavior;
- real device background/sleep/network behavior;
- install/reinstall/update behavior under Play.

Required suite:

1. install from Google Play;
2. launch;
3. email/password signup;
4. email verification;
5. onboarding/profile provisioning;
6. returning email/password sign-in;
7. password reset;
8. Google Sign-In;
9. Firebase ID token -> Express -> MongoDB;
10. session persistence after restart;
11. logout;
12. repeat login preserves the same Invite member;
13. no duplicate MongoDB member/identity mapping;
14. existing-email collision returns `ACCOUNT_LINK_REQUIRED`;
15. background/sleep resume;
16. network-change recovery;
17. uninstall/reinstall or intentional Play update behavior.

Current status: the Play-delivered build installs and launches on the physical test phone. The release owner explicitly waived the remaining functional acceptance suite for this release candidate, so the behaviors below remain unverified rather than passed. See [CURRENT_STATUS.md](./CURRENT_STATUS.md) for the exact evidence and waived checks.

## Google provider testing

Google provider UI is a release/configuration smoke, not a routine unattended CI login path.

A successful native build is not enough. Google Sign-In requires an Android OAuth client matching:

```text
package: com.charifmahmoudi.invite
signing SHA-1: certificate used by that installed build
```

The current relevant identities are:

- repository/test APK SHA-1 for direct APK preflight;
- Play upload key SHA-1 for upload authentication only;
- Play App Signing SHA-1 for builds installed from Google Play.

See [GOOGLE_PLAY_TESTING.md](./GOOGLE_PLAY_TESTING.md).

## Stable managed-auth selectors

```text
welcome-screen
welcome-sign-in
auth-sign-in-screen
auth-registration
auth-email
auth-password
auth-submit
auth-google
auth-error
auth-email-verification
auth-check-verification
auth-profile-onboarding
profile-name
profile-city
profile-submit
```

The compatibility path intentionally reuses core auth selectors so historical Maestro coverage remains useful during migration.

## High-value journeys

Prioritize these managed-auth journeys:

1. register -> verify -> onboard -> same member on returning sign-in;
2. unverified identity cannot provision a profile;
3. password reset preserves the same Invite member;
4. app restart restores the Firebase session;
5. sign-out clears Firebase/Invite/Google session state;
6. Google first sign-in and repeat sign-in resolve to the same member;
7. existing-email collision returns `ACCOUNT_LINK_REQUIRED`;
8. multi-user invitation/capacity rules remain correct under Firebase identities.

Representative multi-user flow:

```text
HOST sign-in -> create activity -> invite GUEST
-> sign out -> GUEST sign-in -> accept invitation
-> assert attendee/capacity state
```

## MongoDB schema gate

The isolated `invite_firebase_e2e` database uses canonical server index definitions. Bootstrap can temporarily use:

```text
MONGODB_ENSURE_INDEXES_ON_START=true
```

Return it to `false` after indexes exist. Normal scale-to-zero startup must not maintain indexes on every cold start.

## Cold-start behavior

Scale-to-zero hosting can make the first request slow. Reads and E2E waits may tolerate a bounded cold-start delay.

Do not blindly retry writes such as activity creation or invitation acceptance until those operations have explicit idempotency guarantees.

## Build/signing evidence

Release evidence should record:

- exact Git commit;
- workflow run ID;
- target API environment;
- Android package/versionCode;
- artifact checksum when relevant;
- signing certificate fingerprint appropriate to the channel;
- Play track/release result;
- screenshots/logs that do not contain secrets.

Do not store passwords, MongoDB URIs, service-account keys, signing private keys, OAuth secrets or live Firebase ID tokens in evidence artifacts.

## Release gate

The Firebase migration is not ready for `main` solely because CI, APK, AAB, store listing or Play track publication passes.

Require the full Play-delivered physical acceptance suite, MongoDB identity verification, collision-safety check, exact-revision recheck, and a safe production client/server cutover plan before promotion.
