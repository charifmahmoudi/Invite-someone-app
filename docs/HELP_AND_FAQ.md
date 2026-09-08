# Help and FAQ

_Last updated: 2026-09-08._

## What is Invite?

Invite helps adults turn shared interests into small, specific local plans. It is designed to make the first move easier without turning every interaction into a large event, dating context, or open-ended message thread.

## What is a plan?

A plan is a concrete activity with a time, meeting place, group size and visibility. Internally the code may call it an `Activity`; user-facing product copy should prefer **plan**.

## Do I need an account?

You can explore the local demo without an account. Real Firebase-backed use requires an account and an Invite profile.

## Why do I need to verify my email?

Invite requires a verified primary email before creating the application profile. This reduces accidental/abusive account creation and gives password-recovery a reliable channel.

Email verification is not government-ID verification or a background check.

## Can I sign in with Google?

Supported Android Firebase builds include **Continue with Google**. Google provides an identity credential to Firebase; Invite still uses its own API and MongoDB for application data and authorization.

## Why can't Invite just merge two accounts with the same email?

Because email equality alone is not strong enough evidence to link identities safely. If an existing Invite profile collides with a new Firebase identity, Invite returns `ACCOUNT_LINK_REQUIRED` instead of silently linking them.

## How do recommendations work?

Current recommendations are deterministic and explainable. They can use signals such as:

- shared interests;
- city/approximate area;
- availability;
- connection goals;
- plan category.

Invite should not infer or rank people using protected or intimate traits.

## Does Invite track my exact location?

The current people map uses broad, approximate area centroids. It is specifically designed not to expose home coordinates or require live-location tracking.

## What does the verification shield mean?

For the Firebase-backed MVP, it means the member's primary Firebase email was verified when the Invite profile was provisioned. It does not mean identity-document verification, criminal-record screening, or endorsement by Invite.

## What does reliability mean?

A reliability percentage should only be shown as evidence-backed once a member has enough real attendance history. New members should be described as new rather than appearing to have a proven 100% record.

A production reliability model needs transparent rules, cancellation grace, attendance confirmation and an appeal/correction path.

## How do I create a plan?

From **Plans**, choose **Create** and provide the plan details. After creation you can invite recommended people or skip invitations for the moment.

The hardening roadmap is simplifying this into a clearer staged workflow and adding host edit/cancel controls.

## What is the difference between Community and Invite-only?

- **Community**: eligible nearby members can discover and join while space is available.
- **Invite-only**: visibility is restricted to the host and authorized invitation/participant paths.

The API, not just the UI, must enforce that difference.

## Can I decline an invitation?

Yes. Declining is a first-class, non-punitive response. Invite is designed so a simple **Not this time** is enough.

## Why can't I join a plan?

Common reasons include:

- the plan is full;
- it is invite-only and you do not have an accepted invitation;
- the plan is no longer available;
- the server rejected the action because your account/session is not authorized.

## What happens if the server is temporarily unavailable?

For Firebase accounts, the hardening build keeps Firebase identity state separate from API/profile state. A temporary API problem should show a retryable error instead of pretending that your Invite profile does not exist.

## How do I reset my password?

Open the sign-in screen, enter your email, then choose **Forgot password?**. Firebase sends reset instructions. See [ACCOUNT_AND_LOGIN_HELP.md](./ACCOUNT_AND_LOGIN_HELP.md).

## How do I report or block someone?

Block/report UI is a required public-MVP capability in [MVP.md](./MVP.md). Until the release notes explicitly state that those controls are implemented, do not assume they are available in the current test build. Testers should use the configured support/operator channel for safety reports.

## Can I delete my account?

Account deletion is also a required public-MVP capability, but it must not be described as implemented until the actual deletion flow and data propagation are complete. Operators should follow the documented support process for test accounts in the meantime.

## Is Invite already in production?

Source code being present on `main` is not the same as production infrastructure being cut over. Render auto-deploy is intentionally disabled. Current environment status is tracked in [CURRENT_STATUS.md](./CURRENT_STATUS.md) and [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md).

## Where can I get more help?

- Account/login: [ACCOUNT_AND_LOGIN_HELP.md](./ACCOUNT_AND_LOGIN_HELP.md)
- Using the app: [USER_GUIDE.md](./USER_GUIDE.md)
- Safety: [SAFETY_GUIDE.md](./SAFETY_GUIDE.md)
- MVP scope: [MVP.md](./MVP.md)
- Engineering/release status: [CURRENT_STATUS.md](./CURRENT_STATUS.md)
