# Current implementation status

_Last verified: 2026-09-08._

This page is the source of truth for the current source, release, infrastructure, and MVP-hardening state. Deployment topology is in [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md); target MVP scope is in [MVP.md](./MVP.md).

## Executive status

Invite is in **MVP hardening**, not production cutover.

- The Firebase migration source was previously fast-forwarded to `main` at `4fa69eeb19c336603a5e6ea1470b24d75150a376`.
- New product hardening is isolated on `impl/mvp-hardening`.
- Production Render, production MongoDB, and production authentication have not been changed by this hardening work.
- Google Play Internal testing remains on Android `versionCode 5`; the Play-delivered application installs and launches on the physical test phone.
- The earlier full Play-installed functional suite was explicitly waived. It remains **not executed, not passed**.

## Environment boundaries

### Source

```text
main
  Firebase migration source promoted
  no hardening promotion in this tranche

impl/mvp-hardening
  active MVP/auth/lifecycle/safety/CI/design/documentation hardening
```

### Firebase staging API

```text
service: invite-someone-api-firebase-e2e
URL: https://invite-someone-api-firebase-e2e.onrender.com
auth: firebase
database: invite_firebase_e2e
auto deploy: off
last known live staging revision before this hardening tranche: ea14d8105e2d09da6aebdd9ff4f272636c7d749a
```

The new lifecycle/block/report server code on `impl/mvp-hardening` has **not** been deployed to this Render service as part of this tranche.

### Production API

```text
service: invite-someone-api
URL: https://invite-someone-api.onrender.com
database: invite_someone
auto deploy: off
last known live production revision: d050cca0dae894159ec3e54f8476f82655f9b1a2
```

A Git branch update is not a Render deployment. Recheck the live revision before attributing runtime behavior to source.

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

No AAB, versionCode, tester, or production Play change was made during MVP hardening.

## MVP hardening: implemented

### Managed authentication state

The client distinguishes:

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

Important invariants:

- only explicit `INVITE_PROFILE_REQUIRED` means profile onboarding is needed;
- a timeout/server outage does not masquerade as a missing profile;
- Firebase mode cannot fall back to a stale compatibility token;
- verified email remains required before profile provisioning;
- matching email never silently links identities; collisions remain `ACCOUNT_LINK_REQUIRED`.

### Plan lifecycle

Implemented on `impl/mvp-hardening`:

- host edit of future plans;
- host soft-cancel of future plans;
- attendee leave;
- host cannot leave their own plan;
- capacity cannot be reduced below current attendance;
- cancelled plans remain as history but cannot be edited, joined, saved, or newly invited to;
- pending invitations are cancelled when the plan is cancelled;
- cancelled/full/invite-only states are surfaced in the plan UI.

The API is authoritative. Client checks exist for UX but do not replace server authorization.

### Blocking

Implemented on `impl/mvp-hardening`:

- block a member from their profile;
- unblock from **Help & Safety -> Blocked people**;
- self-block rejected;
- block relationship stored in `user_blocks` with a unique blocker/blocked index;
- pending invitations between the pair are cancelled;
- blocked peers are removed from people discovery and normal invitation interaction;
- plans hosted by a blocked peer are removed from normal discovery for the blocker;
- blocking is private; the blocked person is not told who blocked them.

### Reporting

Implemented on `impl/mvp-hardening`:

- report profile;
- report plan;
- structured reason plus optional detail;
- report receipt/reference returned to the member;
- server derives `reporterId` from the authenticated session rather than trusting client input;
- moderation records stored in `safety_reports` with open/reviewing/resolved/dismissed status model;
- Help & Safety explains reporting and emergency boundaries.

### Trust presentation

- Firebase `isVerified` means verified primary email, not ID/background verification.
- Members without enough attendance history are described as **New member** instead of being presented as proven 100% reliable.
- The principal profile/person/plan surfaces use the evidence-aware reliability label.

## Automated quality gates

### Standard CI

`.github/workflows/ci.yml` runs:

- TypeScript checks for client/server;
- lint/React rules;
- Jest user-story/domain tests;
- production web export.

### MVP Quality Gate

`.github/workflows/mvp-quality.yml` now contains three independent jobs:

1. **Firebase -> API boundary**
   - genuine disposable Firebase identity;
   - `INVITE_PROFILE_REQUIRED` before provisioning;
   - `VERIFIED_EMAIL_REQUIRED` for an unverified identity.

2. **API lifecycle + safety integration**
   - isolated MongoDB 7 service in CI;
   - three independently authenticated test members;
   - host/non-host edit and cancellation authorization;
   - join/leave and capacity rules;
   - cancelled-plan mutation rejection;
   - self-block rejection;
   - block discovery/invitation enforcement;
   - unblock behavior;
   - profile/plan report creation;
   - direct database assertion that a forged client `reporterId` is ignored.

   The first executed server-integration job for this tranche completed successfully in workflow run `34191403885`.

3. **Android managed-auth + product journeys**
   - Firebase invalid-login smoke;
   - clean demo/core navigation;
   - create -> edit -> cancel plan journey;
   - join -> leave plan journey;
   - report profile -> receive report reference -> block profile journey.

Each demo product journey starts from cleared app storage and does not mutate hosted Firebase/MongoDB staging data.

## Store listing

The listing has title, descriptions, support email, icon, feature graphic, and two phone screenshots. Review of the retained screenshot evidence found a visible Android Quickstep ANR dialog over the earlier captures. The hardening capture script rejects a screenshot while any Invite/system error dialog remains visible. Clean replacement screenshots should be generated before public release.

## Earlier Play-installed acceptance waiver

The earlier versionCode 5 physical-device suite remains waived/not executed for:

- email/password signup and verification;
- returning sign-in;
- password reset;
- Google Sign-In;
- onboarding/profile provisioning;
- Firebase -> Express -> MongoDB end-to-end behavior;
- restart/session persistence;
- logout;
- duplicate identity/member checks;
- `ACCOUNT_LINK_REQUIRED` on the Play-installed path;
- background/sleep/network recovery;
- reinstall/update behavior.

The waiver does not turn those checks into passes.

## Remaining public-MVP gaps

### P0

- Account deletion flow plus reviewed retention/deletion propagation procedure.
- Positive managed-auth E2E for verified onboarding, returning login, restart/session restore, password reset, and multi-user Firebase invitation behavior.
- Regenerate clean Play listing screenshots.
- Run the final exact-candidate quality gates and resolve any failures before promotion.
- Legal/privacy/community-guideline review appropriate to the launch market.

### P1

- Simplify plan creation into a clearer staged/review workflow.
- Continue replacing native alert-only feedback with shared in-app feedback/confirmation patterns.
- Broaden approximate-location coverage beyond the current pilot geography or explicitly constrain the pilot.
- Remove obsolete Supabase compatibility code after confirming no supported path needs it.
- Continue migration away from compatibility bootstrap reads toward resource-oriented APIs.
- Perform large-text/TalkBack and broader real-device usability review.

## Safety invariants

- Verified email is required before Firebase identity provisioning.
- Email equality never silently links identities.
- Existing-email collisions continue to return `ACCOUNT_LINK_REQUIRED` where applicable.
- Authorization is server-side.
- MongoDB credentials/private signing material never enter the mobile bundle.
- Exact home/live location is not required for discovery.
- Blocking does not disclose the blocker to the blocked member.
- The client cannot choose the reporter identity stored in moderation records.

## Production status

**No production operational cutover has been performed as part of this MVP hardening tranche.**

Before any future production operation:

1. recheck exact candidate SHA;
2. recheck exact live production Render revision;
3. verify client/server compatibility;
4. verify required MongoDB indexes/migrations;
5. define rollback;
6. explicitly authorize deployment/cutover;
7. verify `/health`, auth, and production smoke after deployment.

## Documentation map

- [MVP.md](./MVP.md) — public-MVP definition of done.
- [USER_STORIES.md](./USER_STORIES.md) — traceable acceptance stories.
- [USER_GUIDE.md](./USER_GUIDE.md) — member workflows.
- [ACCOUNT_AND_LOGIN_HELP.md](./ACCOUNT_AND_LOGIN_HELP.md) — auth recovery.
- [HELP_AND_FAQ.md](./HELP_AND_FAQ.md) — product FAQ.
- [SAFETY_GUIDE.md](./SAFETY_GUIDE.md) — member safety guidance.
- [SUPPORT_RUNBOOK.md](./SUPPORT_RUNBOOK.md) — support triage.
- [MODERATION_RUNBOOK.md](./MODERATION_RUNBOOK.md) — report/block moderation operations.
- [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md) — environment boundaries.
- [TESTING.md](./TESTING.md) — test layers/evidence.

Never place passwords, MongoDB URIs, signing private keys, OAuth client secrets, Firebase ID tokens, or keystore material in documentation/logs.
