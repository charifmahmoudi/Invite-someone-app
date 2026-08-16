# Product brief

## Vision

Invite helps adults move from “I should meet more people” to a concrete, comfortable plan. The product does not promise instant friendship. It creates repeated opportunities for familiarity, reciprocity, and small acts of initiative—the ingredients from which communities can grow.

## Problem

People often have available time and compatible interests but no socially easy way to make the first move. Existing social networks optimize for content, dating products introduce romantic ambiguity, and large event platforms can feel anonymous. A direct invitation is warmer, but sending one to a near-stranger can feel unusually risky.

Invite reduces that risk by providing:

- enough profile context to find plausible compatibility;
- a structured activity instead of an open-ended social request;
- clear capacity, visibility, time, place, and tone;
- invitations that are easy to accept or decline without guilt;
- repeated exposure to the same local people and hosts.

## Primary personas

### The new local

Recently moved or changed life stage. They know what they enjoy but have not built a dependable local circle. They need visible low-pressure plans and reassurance that coming alone is normal.

### The quiet initiator

Willing to host something small but uncomfortable sending an unstructured message. They need a guided creation flow, compatible invitee suggestions, and a respectful invitation template.

### The community seed

Already brings people together and wants a lighter way to make gatherings more inclusive. They need reliable attendance signals, repeat invitations, sensible group limits, and safety/moderation tools.

## Product principles

1. **Small before large.** Default to plans where names and conversations can be remembered.
2. **Specific beats vague.** Time, place, activity, group size, and tone are visible before a decision.
3. **No-pressure consent.** Declining is a first-class, non-punitive outcome.
4. **Explain recommendations.** Matching uses shared interests, location, availability, and reliability—not sensitive personal traits.
5. **Safety in the path.** First-meeting guidance appears where a member decides and attends, not in a forgotten policy page.
6. **Trust through consistency.** Reliability is understandable and should eventually be backed by attendance feedback and appeals.

## MVP scope

- Email account creation and sign-in through Supabase Auth
- Member profile and editable preferences
- People discovery and transparent recommendation reasons
- Community and invite-only activity creation
- Capacity, time, place, category, and vibe selection
- Personalized invitation creation and lifecycle
- Received/sent invitation views
- Community activity joining and saved activities
- Demo data and local persistence for product evaluation
- Row-level data authorization and database capacity constraints

## Explicitly post-MVP

- Push notification delivery and notification preferences
- Chat or activity discussion threads
- Blocking, reporting, moderation case management, and appeals UI
- Profile and activity photo upload/moderation
- Calendar sync, maps, and live location
- Repeat groups/communities and recurring activities
- Attendance confirmation and a production reliability model
- Localization and right-to-left layout verification
- Analytics, experimentation, and recommendation learning
- Apple/Google social sign-in and account deletion UI

## Success measures

North-star metric: **members who attend a second activity with at least one person they previously met through Invite within 30 days**.

Supporting measures:

- Profile completion rate
- Activity creation completion rate
- Invitation send-to-accept rate
- Time from signup to first accepted plan
- Show-up rate and host cancellation rate
- Percentage of attendees who arrive alone and report feeling welcome
- Decline rate without subsequent churn, as a signal that “no” feels safe
- Safety report rate and median moderation response time

Guardrail measures:

- Reports, blocks, and repeat unwanted invitations
- Capacity override attempts and authorization failures
- Recommendation concentration across demographic proxies
- Host/guest cancellation asymmetry

## Launch assumptions to validate

- A plan of 4–8 people feels safer and more conversational than a large public event.
- A short personal note materially increases invitation acceptance.
- Matching explanations increase trust without overpromising compatibility.
- People will host more often when creation and invitee selection take under two minutes.
- Repeated local encounters matter more than an endlessly expanding people catalog.
