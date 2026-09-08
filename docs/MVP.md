# Invite MVP definition

_Last updated: 2026-09-08._

This document defines the smallest public version of Invite that is useful, supportable, and safe enough to operate. It deliberately separates **MVP** from future product expansion.

## MVP outcome

A member can create and recover an account, build a useful profile, discover compatible people and plans, create a small plan, invite people, respond to invitations, manage their participation, get help, and protect themselves from unwanted interaction.

The MVP is complete only when those journeys are understandable to a first-time user and protected by automated regression tests.

## Required MVP capabilities

### Account and identity

- Firebase email/password registration.
- Verified email before Invite profile provisioning.
- Returning email/password sign-in.
- Password reset.
- Android Google Sign-In through Firebase.
- Session restoration after app restart.
- Explicit logout.
- Safe `ACCOUNT_LINK_REQUIRED` behavior when an existing Invite email collides with a new Firebase identity.
- Clear handling for invalid credentials, expired/rejected sessions, unavailable backend, and offline/network timeout states.

Email equality alone is never sufficient to link identities.

### Profile and discovery

- Name, city/approximate area, interests, availability, connection goals, headline and bio.
- Profile editing.
- People search and filters.
- Explainable compatibility signals.
- Approximate-area discovery without exact home coordinates.
- Email-verification trust signal with clear semantics.
- No unsupported reliability claim for members without enough attendance history.

### Plans

- Create a plan with title, description, category, date/time, meeting place, city, group size, vibe and visibility.
- Review the plan before/after creation.
- Edit a hosted plan.
- Cancel a hosted plan.
- Join a community plan when capacity allows.
- Leave a plan when the member is not the host.
- Clear cancelled/full/invite-only/past states.

### Invitations

- Recommend plausible invitees with understandable reasons.
- Send one or more invitations with an optional short note.
- Received and sent invitation views.
- Accept, decline and cancel pending invitations with server-side ownership checks.
- No duplicate active invitation for the same person/plan.
- Capacity enforcement remains authoritative on the API.

### Safety and support

Before public launch the MVP must include, at minimum:

- block member;
- report member;
- report plan;
- account deletion request/flow;
- Help & Safety entry point;
- support contact path;
- community/safety guidance in the decision path;
- operator handling instructions for reports and account deletion.

Chat, sophisticated moderation tooling, automated image moderation and recommendation ML are not required for the first MVP.

## UX quality bar

Every primary journey must provide:

- a clear primary action;
- useful loading state;
- actionable validation/error state;
- retry or recovery when retry is safe;
- confirmation for destructive actions;
- empty-state guidance;
- accessible labels and practical touch targets;
- consistent product vocabulary.

User-facing copy should prefer **plan** over **activity**. `Activity` can remain an internal domain term.

## Automated quality bar

The MVP candidate must pass:

1. TypeScript type checks for client and server.
2. ESLint / React rules.
3. Domain and reducer tests.
4. Server authorization/integration tests for the critical write/read rules.
5. Genuine Firebase-token boundary smoke against the isolated Firebase API.
6. Android managed-auth UI smoke on an emulator.
7. Android core navigation/journey smoke.
8. Production web export.
9. Release build/signing checks for any Play candidate.

The Play-installed physical suite may be run separately as a release acceptance activity. If it is explicitly waived, documentation must say **waived/not executed**, never **passed**.

## Explicitly post-MVP

- Chat or discussion threads.
- Push notification preferences beyond basic release needs.
- Recurring groups and recurring plans.
- Calendar synchronization.
- Precise/live location.
- Learned recommendation ranking.
- Full media upload/transformation pipeline.
- Production reliability scoring until attendance evidence and appeals exist.
- Rich moderation case-management dashboard.
- Localization and RTL support.
- Experimentation platform and advanced analytics.

## Definition of done

An MVP candidate is ready for a production decision when:

- all required capabilities above are implemented or explicitly removed from product claims;
- P0 defects are closed;
- automated quality gates are green on the exact candidate SHA;
- documentation matches the actual SHA/environment architecture;
- help, login recovery and safety content are available in the repository/app;
- production Render and MongoDB changes have a reviewed cutover and rollback plan;
- no production infrastructure change is inferred merely from a source-code merge.
