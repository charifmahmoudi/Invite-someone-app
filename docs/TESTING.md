# Testing strategy

This document defines **what each test layer must prove**. For current progress, see [CURRENT_STATUS.md](./CURRENT_STATUS.md). For exact operator steps, test-user creation and release acceptance, use [FIREBASE_OPERATIONS_RUNBOOK.md](./FIREBASE_OPERATIONS_RUNBOOK.md).

## Test layers

```text
Device/provider acceptance     few, release-focused
Hosted API + Firebase smoke
MongoDB/API integration
Domain/unit/component tests
TypeScript/lint/build gates     many, fast
```

No single layer proves native behavior, provider configuration, authorization and MongoDB correctness at once.

## CI gates

The standard `CI` workflow runs on `main`, `impl/**`, pull requests and manual dispatch:

```bash
npm ci
npm run typecheck
npm run lint
npm run test:ci
npm run export:web -- --output-dir dist
```

It proves TypeScript correctness, ESLint/React Compiler rules, domain/user-story tests and a production web export.

Firebase staging adds two provider/native workflows:

- **Firebase Hosted Auth Smoke** creates a disposable real Firebase password user, obtains a genuine Firebase ID token, proves the isolated Express API accepts it, proves an unverified user cannot provision MongoDB state, and deletes the user.
- **Validate Firebase Android** checks the isolated API, runs Expo Android prebuild, verifies Firebase native configuration, builds the release APK, checks the embedded JS bundle and signing certificate, and uploads the short-lived E2E APK.

The compatibility mobile-preview workflow on `main` remains independent from Firebase staging.

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

Do not introduce an auth bypass just to make E2E easier. Hosted release smokes must prove real Firebase-issued tokens.

## Android acceptance strategy

Use a **Google-Play-enabled Android emulator first**. It is the primary environment for the full Firebase acceptance suite:

- email/password registration and sign-in;
- verification-state refresh;
- onboarding/profile provisioning;
- password reset;
- Firebase session restoration after process restart;
- sign-out;
- Google Sign-In;
- Firebase ID token -> Express -> MongoDB behavior;
- stable Firebase UID -> Invite user mapping.

The emulator image must include Google Play services for Google Sign-In.

After the emulator suite passes, run a **short physical-phone smoke** only for behavior the emulator cannot fully prove: real email/browser handoff, Google account chooser, real-device background/session behavior, installation and network recovery.

The exact sequence is documented in [FIREBASE_OPERATIONS_RUNBOOK.md](./FIREBASE_OPERATIONS_RUNBOOK.md).

## Google provider testing

Google provider UI is a release/configuration smoke, not a routine CI login path. Consent screens and device/provider challenges make unattended UI automation brittle.

A successful native build is not enough. Google Sign-In also requires an Android OAuth client matching:

```text
package: com.charifmahmoudi.invite
signing SHA-1: certificate used by that installed build
```

Repository APK signing, Internal App Sharing signing and Play App Signing can use different certificates. See [GOOGLE_PLAY_TESTING.md](./GOOGLE_PLAY_TESTING.md).

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

The compatibility path intentionally reuses the core auth selectors so existing Maestro coverage remains useful during migration.

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

The isolated `invite_firebase_e2e` database uses the server's canonical index definitions. Bootstrap can temporarily use:

```text
MONGODB_ENSURE_INDEXES_ON_START=true
```

Return it to `false` after indexes exist. Normal scale-to-zero startup must not maintain indexes on every cold start.

## Cold-start behavior

Free/scale-to-zero hosting can make the first request slow. Reads and E2E waits may tolerate a bounded cold-start delay.

Do not blindly retry writes such as activity creation or invitation acceptance until those operations have explicit idempotency guarantees.

## Secrets and evidence

Safe/public client configuration includes Firebase Web config, OAuth client IDs and E2E API URLs. Never log or commit MongoDB URIs, passwords, OAuth client secrets, Firebase service-account private keys, signing private keys or Firebase ID tokens.

Device/release jobs should retain the build artifact, commit identifier, target environment and useful screenshots/logs without secrets.

## Release gate

The Firebase migration is not ready for `main` solely because CI or the APK build passes. Require the emulator suite, collision-safety check, short physical-phone smoke and Play-distribution signing test described in the runbooks before promotion.
