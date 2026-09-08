# Current implementation status

_Last verified: 2026-09-08._

This page is the source of truth for the current source, release, infrastructure and MVP-hardening state. Deployment topology is in [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md); target MVP scope is in [MVP.md](./MVP.md).

## Executive status

Invite has moved from Firebase migration work into **MVP hardening**.

- The Firebase migration source was fast-forwarded to `main` at `4fa69eeb19c336603a5e6ea1470b24d75150a376`.
- Production infrastructure was **not** cut over when source was promoted.
- The production Render API remains on its earlier live revision and compatibility/internal authentication until an explicit future production cutover.
- Google Play Internal testing versionCode **5** installs and launches on the physical test phone.
- The release owner explicitly waived the full Play-installed functional acceptance suite for that earlier candidate. The suite is **not passed**.
- New hardening work is isolated on `impl/mvp-hardening` until its quality gates are green and it is deliberately promoted.

## Environment boundaries

### Source

```text
main
  Firebase migration source promoted
  promotion baseline: 4fa69eeb19c336603a5e6ea1470b24d75150a376

impl/mvp-hardening
  active MVP/login/CI/design/documentation hardening
```

### Firebase staging API

```text
service: invite-someone-api-firebase-e2e
URL: https://invite-someone-api-firebase-e2e.onrender.com
auth: firebase
database: invite_firebase_e2e
auto deploy: off
last known live staging revision before hardening: ea14d8105e2d09da6aebdd9ff4f272636c7d749a
```

### Production API

```text
service: invite-someone-api
URL: https://invite-someone-api.onrender.com
database: invite_someone
auto deploy: off
last known live production revision: d050cca0dae894159ec3e54f8476f82655f9b1a2
```

The live Render revision must always be rechecked before any production operation. A Git branch update is not a deployment because auto-deploy is disabled.

## Google Play Internal testing

Current published test release:

```text
package: com.charifmahmoudi.invite
track: internal
versionCode: 5
release: Invite Internal 15
publication workflow run: 34155373675
```

Verified distribution state:

- configured tester account is recognized;
- test opt-in/download page is available;
- Google Play shows the test build;
- Play-delivered installation succeeds on the physical test phone;
- application launches/runs on that device.

Do not bump versionCode merely to troubleshoot listing/tester/install issues. A subsequent AAB release requires an appropriate new versionCode.

## Store listing

API-visible listing assets currently include:

- title;
- short description;
- full description;
- support email;
- 512x512 icon;
- 1024x500 feature graphic;
- two phone screenshots.

The earlier screenshot workflow succeeded technically, but review of the retained evidence found an Android **Quickstep isn't responding** system dialog visible over both captured screens. Those screenshots should be regenerated before they are treated as acceptable public-facing creative.

The hardening branch changes `scripts/play-store-capture.sh` so a target screen is not accepted while an ANR/error dialog is present and capture is rejected if a system error remains visible.

## Earlier acceptance waiver

The release owner explicitly waived the full Play-installed functional suite for the versionCode 5 test candidate.

Therefore these physical-device Play-installed journeys remain unverified for that candidate:

- email/password signup;
- email verification;
- returning email/password sign-in;
- password reset;
- Google Sign-In;
- onboarding/profile provisioning;
- Firebase ID token -> Express -> MongoDB end-to-end behavior;
- session persistence after restart;
- logout;
- duplicate-identity/member prevention in the Play-installed flow;
- `ACCOUNT_LINK_REQUIRED` in the Play-installed flow;
- background/sleep/network recovery;
- reinstall/update behavior.

The waiver is historical release evidence. It does not prevent new automated hardening tests from being added now.

## MVP hardening branch: implemented changes

### Managed auth state

The hardening work replaces ambiguous login/profile inference with explicit managed-auth states:

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

Key behavior:

- only explicit `INVITE_PROFILE_REQUIRED` is treated as missing Invite profile;
- a server outage/timeout no longer routes the member into profile creation;
- 401/rejected Invite session is a separate recovery state;
- Firebase mode cannot fall back to a stale compatibility token stored on the device;
- real Firebase/MongoDB accounts are no longer labelled as local preview profiles;
- logout copy distinguishes preview data from a real account;
- typed API errors preserve HTTP status and server `code` for safe routing.

### Verification semantics

For a newly provisioned Firebase profile, `isVerified` now represents the fact that the primary Firebase email was verified at provisioning time. It does **not** mean government-ID verification or a background check.

### Reliability semantics

A shared formatter now treats members with insufficient attendance history as **New member** rather than automatically presenting the seed/default 100 score as proven reliability. Remaining screens still need to adopt that formatter consistently before the trust-signal cleanup is complete.

### Android/CI quality gate

The hardening branch adds `.github/workflows/mvp-quality.yml` with two independent checks:

1. **Firebase -> API boundary**
   - creates a disposable genuine Firebase user;
   - proves `/v1/me` returns `INVITE_PROFILE_REQUIRED` before provisioning;
   - proves unverified profile provisioning returns `VERIFIED_EMAIL_REQUIRED`;
   - deletes the disposable Firebase user.

2. **Android managed-auth + core navigation smoke**
   - builds a Firebase-enabled Android release APK;
   - boots an API 35 Pixel 6 emulator with KVM;
   - exercises a real Firebase invalid-login journey;
   - exercises clean-state demo/core navigation;
   - retains Maestro evidence.

This workflow is configured for `main`, `impl/mvp-hardening`, PRs targeting `main`, and manual dispatch. It does **not** publish an AAB or touch production.

### Documentation/help

New/reworked documentation includes:

- [MVP definition](./MVP.md)
- [User guide](./USER_GUIDE.md)
- [Account and login help](./ACCOUNT_AND_LOGIN_HELP.md)
- [Help and FAQ](./HELP_AND_FAQ.md)
- [Member safety guide](./SAFETY_GUIDE.md)
- [Support runbook](./SUPPORT_RUNBOOK.md)
- [Updated product brief](./PRODUCT.md)
- [Rewritten executable user stories](./USER_STORIES.md)

## MVP gaps still open

### P0 / before public MVP

- Finish/verify managed-auth hardening with green CI and Android smoke.
- Add server integration tests for authorization and critical transactional write paths.
- Add positive managed-auth E2E for verified onboarding, returning login, restart/session restore and multi-user invitation behavior.
- Add host plan edit/cancel and attendee leave flows.
- Add block/report controls and server enforcement.
- Add account deletion path and retention/deletion procedure.
- Regenerate clean Play listing screenshots.
- Reconcile remaining stale architecture/testing/release documents with the hardening branch.

### P1 / product quality

- Finish design-system pass and remove one-off visual state patterns.
- Replace core native alert-only feedback with consistent in-app success/error/confirmation patterns.
- Simplify plan creation into a clearer staged workflow.
- Apply evidence-aware reliability display consistently.
- Clarify verified-email labels wherever the shield is shown.
- Expand approximate-location support beyond the currently hard-coded pilot cities or explicitly declare the pilot geography.
- Remove obsolete Supabase compatibility code/dependency after confirming no required path still uses it.
- Migrate the client away from compatibility `/v1/data` bootstrap toward resource reads.

## Safety invariants that remain non-negotiable

- Verified email is required before Firebase identity provisioning.
- Email equality never silently links identities.
- Existing-email/domain collisions continue to return `ACCOUNT_LINK_REQUIRED` where applicable.
- Authorization remains server-side.
- MongoDB credentials/private signing material never enter the mobile bundle.
- Exact home/live location is not required for people discovery.

## Production status

**No production operational cutover has been performed as part of MVP hardening.**

Do not infer production deployment from either `main` or `impl/mvp-hardening` source state. Before any future production operation:

1. recheck exact source candidate SHA;
2. recheck exact live production Render revision;
3. verify production client/server compatibility plan;
4. define rollback;
5. explicitly authorize the deploy/cutover;
6. verify `/health` and production smoke behavior after deploy.

## Documentation map

- [MVP.md](./MVP.md) — required public-MVP capabilities and definition of done.
- [PRODUCT.md](./PRODUCT.md) — product vision/scope.
- [USER_STORIES.md](./USER_STORIES.md) — traceable acceptance stories and test targets.
- [USER_GUIDE.md](./USER_GUIDE.md) — current member workflow guide.
- [ACCOUNT_AND_LOGIN_HELP.md](./ACCOUNT_AND_LOGIN_HELP.md) — account-state/recovery help.
- [HELP_AND_FAQ.md](./HELP_AND_FAQ.md) — product FAQ.
- [SAFETY_GUIDE.md](./SAFETY_GUIDE.md) — member-facing safety guidance.
- [SUPPORT_RUNBOOK.md](./SUPPORT_RUNBOOK.md) — operator triage.
- [ARCHITECTURE.md](./ARCHITECTURE.md) — application architecture.
- [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md) — environments/deployment boundaries.
- [TESTING.md](./TESTING.md) — test layers and release evidence.

Never place passwords, MongoDB URIs, signing private keys, OAuth client secrets, Firebase ID tokens or keystore material in documentation or logs.
