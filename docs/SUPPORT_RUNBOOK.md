# Support runbook

_Last updated: 2026-09-08._

This runbook is for Invite operators handling account, access, data and safety-support requests during MVP testing and launch preparation.

It does not authorize bypassing identity protections or modifying production data casually.

## Triage principles

1. Identify the environment first: demo/local, staging/Internal testing, or production.
2. Preserve user identity boundaries. Never link accounts from email equality alone.
3. Ask for the minimum information needed to investigate.
4. Never request passwords, Firebase ID tokens, signing keys, private keys or MongoDB connection strings from users.
5. Treat safety reports as higher priority than cosmetic defects.
6. Record what was actually verified; do not turn assumptions into incident facts.
7. Production source state and Render deployment state are separate because auto-deploy is disabled.

## Information to request

For a normal technical support case:

- approximate incident time and timezone;
- device/OS model when relevant;
- whether the build came from Google Play or a direct APK;
- app version/versionCode if known;
- account method: email/password or Google;
- exact user-visible error message;
- action the user was attempting;
- whether the issue reproduces;
- whether network type changed;
- screenshots only when they do not expose secrets/private information.

Do not ask for credentials.

## Severity

### S0 — immediate safety or active compromise

Examples:

- credible threat of physical harm;
- account takeover in progress;
- exposed signing/private credentials;
- authorization defect exposing private invite-only data broadly.

Actions:

- preserve evidence with restricted access;
- reduce ongoing harm immediately;
- involve the responsible security/safety operator;
- do not wait for routine engineering triage;
- document every privileged action.

### S1 — critical product failure

Examples:

- Firebase identities resolving to the wrong Invite member;
- `ACCOUNT_LINK_REQUIRED` protection bypass;
- widespread inability to sign in;
- invitations or private plans visible to unrelated users;
- destructive data corruption.

Stop release/promotion work until contained.

### S2 — major workflow failure

Examples:

- onboarding cannot complete;
- password reset consistently fails;
- plan creation or invitation responses fail for many users;
- Android release cannot launch.

### S3 — normal defect/question

Examples:

- confusing copy;
- isolated layout issue;
- help question;
- minor filter behavior.

## Login issue decision tree

### Invalid credentials

If Invite shows the normal credential mismatch message:

- confirm correct sign-in method;
- suggest password reset for password accounts;
- do not confirm whether another person's email exists.

### Email not verified

- ask the user to open/resend the Firebase verification email;
- have them return and refresh verification state;
- do not manually provision an unverified identity.

### `INVITE_PROFILE_REQUIRED`

This means Firebase identity is valid but no Invite mapping exists. The normal resolution is profile onboarding.

### `ACCOUNT_LINK_REQUIRED`

Do not create a mapping manually merely because emails match.

Before any future account-link operation, the product must require recent proof of control of both identities or an explicitly reviewed operator process. Until then, escalate the case rather than bypassing the control.

### Backend unavailable

Check, in order:

1. staging/production API health for the relevant environment;
2. Render deploy/revision state;
3. MongoDB connectivity/health;
4. whether the failure is a cold start or persistent outage;
5. client network symptoms.

A backend outage must not be treated as proof that the user needs a new profile.

## Google Sign-In triage

Record whether the app was installed from Google Play or directly as an APK. The certificate identity differs by distribution channel.

For a Play-installed Android build, verify the package/SHA-1 OAuth registration corresponds to the Play App Signing certificate, not merely the upload key or repository/test APK certificate.

## Data and identity checks

When privileged database inspection is necessary, verify separately:

- Firebase UID / provider subject;
- `user_identities` mapping;
- stable Invite user ID;
- member normalized email;
- duplicate identity mappings;
- duplicate member records.

Do not repair by deleting records until the cause and rollback are understood.

## Account deletion requests

The public MVP requires an explicit account deletion flow. Until that automated flow exists, deletion requests require operator handling with a documented checklist covering:

- identity verification;
- Invite member record;
- identity mapping;
- invitations and participation records according to retention policy;
- saved data;
- Firebase account deletion when appropriate;
- deletion propagation/retention exceptions;
- completion record that contains no unnecessary sensitive data.

A legal/privacy-reviewed retention policy is still required before public launch.

## Safety reports

Capture:

- reporter Invite user ID;
- reported member/plan IDs;
- category of concern;
- concise description;
- relevant timestamps;
- evidence location/access restrictions;
- immediate-harm assessment;
- action taken and reason.

Avoid copying sensitive evidence into broad-access chat/ticket systems.

The public MVP still needs in-app report/block controls and a moderation workflow. See [SAFETY_AND_PRIVACY.md](./SAFETY_AND_PRIVACY.md) and [SAFETY_GUIDE.md](./SAFETY_GUIDE.md).

## Release-impacting defects

A defect is release-blocking when it compromises:

- account ownership;
- verified-email enforcement;
- authorization/private data isolation;
- capacity/invitation transactional correctness;
- app startup/installability;
- primary signup/sign-in/onboarding journey;
- basic safety/reporting capability required by the MVP definition.

## Escalation evidence

For engineering escalation, include:

- exact Git SHA;
- environment/API URL name (not secrets);
- Render service/revision when known;
- Google Play track/versionCode when relevant;
- workflow run/job ID;
- sanitized logs;
- reproduction steps;
- expected vs actual behavior.

## Closeout

Before closing a support/incident case:

- verify the user-facing outcome;
- record the actual root cause if known;
- link the regression test or follow-up work when appropriate;
- update help/runbook content if the case exposed a documentation gap;
- never mark an unexecuted test as passed.
