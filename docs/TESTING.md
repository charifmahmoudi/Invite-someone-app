# Testing strategy

_Last verified: 2026-09-08._

This document defines what each test layer must prove. For current implementation/release state, see [CURRENT_STATUS.md](./CURRENT_STATUS.md). For public-MVP requirements, see [MVP.md](./MVP.md).

## Test layers

```text
Play-delivered physical acceptance      release/device evidence
Android managed-auth E2E                repeatable native journey coverage
Hosted Firebase/API boundary            real provider trust boundary
MongoDB/API integration                 authorization + transaction invariants
Domain/unit/component tests             business rules and UI state
TypeScript/lint/build gates              static/packaging correctness
```

No single layer proves native behavior, provider configuration, Play signing, authorization, and MongoDB correctness at once.

## Standard CI

`.github/workflows/ci.yml` runs on `main`, `impl/**`, pull requests, and manual dispatch:

```bash
npm ci
npm run typecheck
npm run lint
npm run test:ci
npm run export:web -- --output-dir dist
```

It proves:

- client/server TypeScript correctness;
- ESLint/React rules;
- current Jest domain/user-story tests;
- production web exportability.

It does **not** currently prove server authorization, Firebase hosted behavior, or Android runtime behavior by itself.

## MVP Quality Gate

The hardening branch adds `.github/workflows/mvp-quality.yml` for `main`, `impl/mvp-hardening`, PRs targeting `main`, and manual dispatch.

### Firebase -> API boundary job

Uses a disposable genuine Firebase password identity and the isolated Firebase staging API.

It currently proves:

- staging `/health` responds;
- the token is accepted as a genuine Firebase identity;
- an unmapped Firebase identity gets `403 INVITE_PROFILE_REQUIRED` from `/v1/me`;
- an unverified Firebase identity gets `400 VERIFIED_EMAIL_REQUIRED` from provisioning;
- the disposable Firebase account is deleted after the run.

This test intentionally uses no Invite authentication bypass.

### Android managed-auth + core-navigation job

The job:

- checks out the exact branch SHA;
- prebuilds a Firebase-enabled Android project;
- builds a release APK;
- boots an API 35 Pixel 6 emulator;
- runs a managed-auth invalid-credential flow;
- resets app state;
- runs clean-state demo/core navigation;
- retains Maestro evidence.

The runner prefers KVM acceleration when `/dev/kvm` exists and falls back to software acceleration rather than failing before emulator startup solely because a particular GitHub runner does not expose KVM.

Current Maestro flows:

```text
.maestro/auth/firebase-invalid-sign-in.yaml
.maestro/core/demo-navigation.yaml
```

Current coverage is deliberately a smoke layer, not yet the complete managed-auth E2E suite.

## Managed-auth state coverage

The hardening client distinguishes:

```text
loading
signed-out
unverified
profile-required
ready
account-link-required
session-error
backend-unavailable
```

High-value regression tests should prove:

- `INVITE_PROFILE_REQUIRED` alone routes to profile onboarding;
- generic network/server errors do not route to onboarding;
- `ACCOUNT_LINK_REQUIRED` is blocking and never auto-links;
- rejected/expired API sessions have retry/sign-out recovery;
- Firebase mode cannot fall back to an old Invite-issued compatibility token;
- restarting a ready account resolves the same Invite member;
- sign-out clears Invite/Firebase/native-Google session state as appropriate.

## Domain tests

Fast Jest tests currently cover:

- registration/profile/plan validation;
- matching/recommendation logic;
- people discovery/filter behavior;
- reducer transitions for plan creation;
- invitation send/accept/decline;
- community join de-duplication;
- saved-plan state.

Coverage remains too concentrated in `src/domain`; public-MVP work should add component/auth-state tests and server integration tests.

## Required server integration suite

Before public MVP, add automated tests for at least:

- protected endpoints reject unauthenticated requests;
- malformed/expired/wrong-audience/wrong-issuer Firebase tokens fail;
- a valid Firebase UID resolves only its mapped Invite user;
- unmapped identity behavior is `INVITE_PROFILE_REQUIRED` where appropriate;
- verified email is required for provisioning;
- matching email alone cannot claim an existing Invite account;
- duplicate/racing provisioning does not create duplicate members/mappings;
- only a member can edit their own profile;
- only a plan host can edit/cancel the plan;
- only eligible non-host attendees can leave;
- only a host can send/cancel its invitations;
- only the receiver can accept/decline;
- invite-only/private data is not leaked;
- final-slot capacity remains transactionally correct under concurrency;
- invitation acceptance and attendee insertion commit/rollback together;
- blocked-member rules are enforced once implemented;
- saved plans remain private;
- public profiles do not expose another member's email/auth data;
- account deletion follows the defined retention/deletion contract once implemented.

Do not add an authentication bypass merely to make this suite easier.

## Google provider testing

Android Google Sign-In depends on the installed build's certificate identity.

```text
package: com.charifmahmoudi.invite
OAuth Android registration: package + installed signing SHA-1
```

Three relevant signing identities exist:

- repository/test APK certificate for direct APK testing;
- Play upload certificate for upload authentication;
- Play App Signing certificate for builds installed from Google Play.

A direct APK Google smoke cannot prove the Play-signed OAuth path. A controlled Play-installed provider smoke remains valuable before production distribution.

Unattended Google account selection is also less deterministic than email/password automation; CI should verify build/configuration where possible without storing a real person's Google credentials.

## Play Store screenshot testing

The earlier screenshot workflow run `34176724947` technically succeeded and published two screenshots. Later review of its evidence found a visible Android system `Quickstep isn't responding` dialog over the captures.

Therefore those images are **not acceptable creative evidence** even though the API upload succeeded.

The hardening version of `scripts/play-store-capture.sh` now:

- detects Android `isn't responding` dialogs;
- never hides an Invite ANR;
- may choose **Wait** for a non-Invite system ANR;
- re-dumps UI state before accepting a target screen;
- runs a clean-capture assertion immediately before each screenshot;
- fails if an ANR/error dialog remains visible.

Clean screenshots should be regenerated before public release.

## Play-delivered physical-device acceptance

A Play-installed device test is the only layer that can directly exercise, together:

- Play tester delivery;
- Play App Signing installation identity;
- Play-signed Google OAuth configuration;
- real Android account chooser behavior;
- physical-device sleep/background/network behavior;
- install/reinstall/update behavior.

The earlier versionCode 5 candidate **does install and launch** on the physical test phone.

The release owner explicitly waived the full functional suite for that candidate. Therefore the following are **waived/not executed, not passed** for that candidate:

1. email/password signup;
2. email verification;
3. onboarding/profile provisioning;
4. returning email/password sign-in;
5. password reset;
6. Google Sign-In;
7. Firebase ID token -> Express -> MongoDB;
8. restart/session persistence;
9. logout;
10. repeated login preserves the same Invite member;
11. no duplicate MongoDB member/identity mapping;
12. existing-email collision returns `ACCOUNT_LINK_REQUIRED`;
13. background/sleep resume;
14. network-change recovery;
15. reinstall/update behavior.

A future production candidate may choose a different acceptance policy, but documentation must always distinguish **executed and passed** from **waived/not executed**.

## High-value managed-auth journeys to automate next

1. disposable Firebase user -> programmatic verification -> app onboarding -> stable Invite member;
2. returning email/password sign-in -> same member;
3. app process restart -> session restores -> same member;
4. password reset -> same Invite identity;
5. logout -> no residual Invite/Firebase session;
6. existing-email collision -> `ACCOUNT_LINK_REQUIRED`;
7. host creates plan -> invites guest -> guest accepts -> attendee/capacity state correct;
8. host edit/cancel and attendee leave once those workflows are implemented;
9. block/report/delete once public-MVP safety controls are implemented.

Representative multi-user flow:

```text
HOST auth/onboard
  -> create plan
  -> invite GUEST
  -> sign out
GUEST auth/onboard
  -> accept invitation
  -> assert attendee/capacity
```

## Emulator strategy

Current native CI target:

```text
API level: 35
architecture: x86_64
profile: Pixel 6
```

Use emulators for repeatability, not as a claim that every physical-device or Play-signing behavior was proven.

## MongoDB schema gate

The isolated `invite_firebase_e2e` database uses canonical server index definitions.

Controlled bootstrap can temporarily set:

```text
MONGODB_ENSURE_INDEXES_ON_START=true
```

Return it to `false` after indexes exist. Normal scale-to-zero startup should not rebuild indexes on every cold start.

## Cold starts and retries

Render scale-to-zero can make a first request slower.

Reads and safe status checks may use bounded retries. Do not blindly retry non-idempotent writes such as plan creation or invitation acceptance until the operation has an explicit idempotency contract.

A cold start or timeout must never be interpreted as proof that a Firebase member has no Invite profile.

## Evidence requirements

Release/test evidence should record as applicable:

- exact Git SHA;
- workflow run/job ID;
- target API environment;
- Android package/versionCode;
- artifact checksum;
- signing certificate fingerprint for the tested channel;
- Play track/release result;
- sanitized screenshots/logs.

Never store in test evidence:

- passwords;
- MongoDB URIs;
- Firebase ID/refresh tokens;
- OAuth client secrets;
- service-account private keys;
- keystores/signing private keys;
- password-reset links.

## MVP quality gate

A public MVP candidate is not ready merely because TypeScript, APK/AAB build, store listing, or Play upload succeeds.

Require the exact candidate SHA to satisfy the automated quality bar in [MVP.md](./MVP.md), have no open P0 identity/authorization/safety defects, have a reviewed production cutover/rollback plan, and have documentation that accurately records any manual/physical tests that were executed or waived.
