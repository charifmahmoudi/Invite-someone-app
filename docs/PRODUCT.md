# Product brief

_Last updated: 2026-09-08._

## Vision

Invite helps adults move from “I should meet more people” to a concrete, comfortable plan. The product does not promise instant friendship. It creates repeated opportunities for familiarity, reciprocity and small acts of initiative—the ingredients from which communities can grow.

## Problem

People often have available time and compatible interests but no socially easy way to make the first move. Existing social networks optimize for content, dating products introduce romantic ambiguity, and large event platforms can feel anonymous. A direct invitation is warmer, but sending one to a near-stranger can feel unusually risky.

Invite reduces that risk by providing:

- enough profile context to find plausible compatibility;
- a structured plan instead of an open-ended social request;
- clear capacity, visibility, time, place and tone;
- invitations that are easy to accept or decline without guilt;
- repeated exposure to the same local people and hosts;
- contextual safety guidance and member controls.

## Primary personas

### The new local

Recently moved or changed life stage. They know what they enjoy but have not built a dependable local circle. They need visible low-pressure plans and reassurance that coming alone is normal.

### The quiet initiator

Willing to host something small but uncomfortable sending an unstructured message. They need a guided creation flow, compatible invitee suggestions and a respectful invitation template.

### The community seed

Already brings people together and wants a lighter way to make gatherings more inclusive. They need reliable attendance signals, repeat invitations, sensible group limits and practical safety/moderation controls.

## Product principles

1. **Small before large.** Default to plans where names and conversations can be remembered.
2. **Specific beats vague.** Time, place, activity, group size and tone are visible before a decision.
3. **No-pressure consent.** Declining is a first-class, non-punitive outcome.
4. **Explain recommendations.** Matching uses shared interests, approximate area, availability and goals—not sensitive personal traits.
5. **Safety in the path.** First-meeting guidance and member controls appear where a member decides and attends, not only in a policy page.
6. **Trust must be earned.** Verification labels must say what was actually verified. Reliability must not look proven before enough attendance evidence exists.
7. **Identity is not the domain.** Firebase proves identity; Invite retains stable application IDs and server-side authorization.
8. **Failure should be recoverable.** A temporary backend problem must not look like account loss or trigger duplicate-profile creation.

## Current target architecture

- Expo / React Native application.
- Firebase Authentication for email/password, verification, password reset and managed sessions.
- Native Android Google Sign-In exchanged into Firebase.
- Express API as the authorization/business-rule boundary.
- MongoDB Atlas for Invite profiles, plans, invitations and identity mappings.
- Render for current API compute.
- Google Play for Android Internal testing and future production distribution.

Firebase is an identity provider, not the Invite application database.

## MVP scope

See [MVP.md](./MVP.md) for the authoritative completeness checklist. Product scope includes:

### Accounts

- Firebase email/password registration and sign-in.
- Verified email before Invite profile provisioning.
- Password reset.
- Android Google Sign-In.
- Session restore and logout.
- Safe existing-email collision behavior (`ACCOUNT_LINK_REQUIRED`).
- Explicit unavailable/expired-session recovery states.

### Member profile and discovery

- Profile introduction and editable preferences.
- Profile-photo URL support while first-party media upload remains later work.
- People discovery with transparent reasons and filters.
- Approximate-area map without exact home/live location.
- Clear email-verification semantics.
- No unsupported reliability claim for brand-new members.

### Plans and invitations

- Community and invite-only plan creation.
- Capacity, time, place, category and vibe selection.
- Host edit/cancel before public MVP completion.
- Community join and member leave behavior.
- Personalized invitation creation and lifecycle.
- Received/sent invitation views.
- Saved plans.
- Server-enforced authorization and capacity constraints.

### Safety and support

Public MVP requires:

- block member;
- report member/plan;
- account deletion path;
- Help & Safety content;
- support contact path;
- operator support/moderation runbooks;
- first-meeting guidance in relevant screens.

These are MVP requirements because Invite facilitates real-world meetings. They are not optional “polish” after public launch.

## Explicitly post-MVP

- Chat or plan discussion threads.
- Rich push-notification preference center.
- Moderated first-party photo upload/transformation pipeline.
- Calendar sync, routing and live location.
- Repeat groups/communities and recurring plans.
- Production reliability scoring until attendance confirmation, grace rules and appeals exist.
- Learned recommendation ranking / recommendation ML.
- Full moderation case-management dashboard and automation.
- Localization and right-to-left layout verification.
- Experimentation platform and advanced analytics.
- iOS Google Sign-In until its native provider configuration is explicitly completed and tested.

## Success measures

North-star metric: **members who attend a second plan with at least one person they previously met through Invite within 30 days**.

Supporting measures:

- Profile completion rate.
- Plan creation completion rate.
- Invitation send-to-accept rate.
- Time from signup to first accepted plan.
- Show-up rate and host cancellation rate.
- Percentage of attendees who arrive alone and report feeling welcome.
- Decline rate without subsequent churn, as a signal that “no” feels safe.
- Safety report rate and median moderation response time.

Guardrail measures:

- Reports, blocks and repeated unwanted invitations.
- Capacity override attempts and authorization failures.
- Recommendation concentration across demographic proxies.
- Host/guest cancellation asymmetry.
- Duplicate-account/identity mapping incidents.

## Launch assumptions to validate

- A plan of roughly 4–8 people feels safer and more conversational than a large public event.
- A short personal note materially increases invitation acceptance.
- Matching explanations increase trust without overpromising compatibility.
- People will host more often when plan creation and invitee selection are fast and predictable.
- Repeated local encounters matter more than an endlessly expanding people catalog.
- Clear decline, block and report paths reduce pressure enough for people to engage with near-strangers.

## Product language

Use **plan** in user-facing copy wherever practical. `Activity` remains an acceptable internal/domain term in code and APIs.

Verification labels must describe the actual proof level. In the current Firebase MVP, the profile shield represents a verified primary email; it is not government-ID verification or a background check.
