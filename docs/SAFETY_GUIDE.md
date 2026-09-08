# Invite safety guide

_Last updated: 2026-09-08._

Invite helps people meet in the real world. No profile, verification badge, recommendation score or invitation removes the need for personal judgment.

## Before accepting a plan

Review:

- who is hosting;
- the plan description;
- date and time;
- meeting place;
- group size;
- whether the plan is community or invite-only;
- who else is shown as attending;
- whether the details are specific enough for you to feel comfortable.

You never owe someone an acceptance. **Not this time** is a complete answer.

## First meetings

For a first meeting with someone you do not already know well:

- meet in a public, populated place;
- avoid giving a stranger your home address;
- keep control of your own transportation;
- tell a trusted person where you are going;
- keep your phone available/charged when practical;
- leave whenever you want;
- do not let social pressure override discomfort.

## Protecting private information

Invite does not need your exact home location for people discovery. The current map model uses broad approximate areas.

Be cautious about adding sensitive information to:

- your biography;
- plan descriptions;
- meeting-place text;
- invitation notes.

Do not post passwords, financial information, identity documents, access codes or private home details.

## Verification and trust signals

### Verified profile

In the current Firebase-backed MVP, the shield indicates that the primary Firebase email was verified at provisioning time.

It does **not** mean:

- government ID was checked;
- a background check was performed;
- Invite guarantees the person's identity;
- Invite guarantees the person is safe.

### Reliability

Reliability is not meaningful for a brand-new member. The hardening work avoids treating a default score as proven history. Any future production reliability system needs transparent event rules, sufficient sample size, cancellation grace, corrections and appeals.

## If a plan changes unexpectedly

If the host asks you to move a first meeting from a public place to a private location, substantially changes who will attend, or pressures you to do something you did not agree to, reconsider the plan. You can leave or decline continued participation.

## Reporting urgent danger

Invite is not an emergency service. If you or someone else is in immediate danger, contact the appropriate local emergency service.

## Blocking and reporting

Block/report controls are required before the public MVP is considered complete. Until a release explicitly documents that they are available in-app, testers should use the operator/support channel to report:

- threats or harassment;
- repeated unwanted invitations;
- impersonation;
- unsafe meeting behavior;
- discriminatory or hateful behavior;
- sexual harassment;
- suspected scams;
- dangerous or illegal plan content;
- privacy violations.

Include only the information needed to investigate. Do not publicly repost sensitive evidence.

## For hosts

Hosts should:

- describe the plan accurately;
- use a realistic capacity;
- choose appropriate public meeting places for early meetings;
- avoid pressuring invitees;
- communicate meaningful changes;
- respect declines and cancellations;
- avoid exposing participants' private information.

## For invitees

Invitees should:

- respond only when comfortable;
- respect plan capacity and host instructions that are reasonable/safe;
- communicate when they can no longer attend;
- avoid sharing another attendee's personal details without consent;
- leave if the situation becomes uncomfortable.

## Product safety boundaries

Invite recommendations intentionally avoid sensitive personal traits. The product should not infer protected or intimate attributes for matching.

The public MVP must add operational safety capabilities—including blocking, reporting and account deletion—before those capabilities are claimed as complete. Engineering status is tracked in [MVP.md](./MVP.md) and [CURRENT_STATUS.md](./CURRENT_STATUS.md).
