# Safety and privacy design

This document records product intent and engineering controls. It is not a complete legal privacy policy, terms of service, or moderation runbook. Those are launch requirements.

## Safety model

Invite facilitates real-world meetings, so harm prevention cannot rely on a disclaimer. The MVP includes contextual guidance and constrained group/activity data, while clearly identifying operational capabilities still required before public release.

### Implemented

- Invitations are optional and offer an equally visible decline action.
- First-meeting guidance recommends public places, independent transport, notifying someone, and leaving freely.
- Activity time, place, host, attendees, visibility, capacity, and tone are shown before joining.
- Invite-only activity authorization is enforced by the API and its database filters.
- A host cannot overbook the declared capacity through concurrent requests.
- Recommendation scoring excludes sensitive personal traits.
- Other members' email addresses are removed from profile responses.
- The people map uses broad neighbourhood centroids, labels itself approximate, and never requests live location.
- MongoDB credentials and JWT signing secrets remain server-side; native bearer tokens use Android Keystore/iOS Keychain storage.

### Required before public launch

- Report, block, mute, and repeated-invitation controls
- Moderator queue, evidence retention rules, escalation SLAs, and appeals
- Emergency/safety contact guidance appropriate to launch countries
- Minimum age policy and age assurance decision
- Content rules and automated/manual review for uploaded images and text
- Account deletion and data export UI
- Precise retention schedule and deletion propagation
- Host cancellation, no-show, and attendance dispute process
- Abuse-rate monitoring without invasive tracking
- Legal review of privacy notice, terms, community guidelines, and processor agreements

## Data minimization

The MVP asks only for city/area-level location, social preferences, and profile copy. It does not request contacts, precise GPS, date of birth, gender, workplace, or address. Map coordinates are shared neighbourhood centroids rather than member coordinates. Meeting-place text can still reveal sensitive locations; UI copy should continue to encourage public venues for early meetings.

## Recommendation fairness

Current recommendations are deterministic and inspectable. Inputs are activity category, shared interests, same-city match, and a reliability threshold. Before adding learned ranking:

1. define the benefit and potential exclusion harms;
2. provide explanations and member controls;
3. audit proxies such as city, language, and availability;
4. measure exposure as well as acceptance;
5. preserve an unranked/browse option;
6. never infer protected or intimate traits.

## Reliability caution

Reliability can help members feel safe but can also punish disability, caregiving, unstable work, or emergencies. The current demo value is illustrative. A production score needs:

- clear event definitions and calculation;
- cancellation grace and host-side accountability;
- attendance confirmation from both sides;
- visible reason/history, correction, and appeal;
- minimum sample size and expiration;
- testing for disparate impact.

## Secrets and logging

- `.env` is ignored; `.env.example` contains placeholders only.
- `EXPO_PUBLIC_*` values are public by design. The HTTPS API address (and optional Supabase publishable values) may appear there; `MONGODB_URI` and `JWT_SECRET` must not.
- Never log access tokens, invitation notes, precise meeting locations, or full profile payloads.
- Use server-side structured audit events for moderation/security actions, with retention limits.
- Rotate exposed secrets immediately and review Git history; removing only the latest file is insufficient.

## Incident priorities

For a suspected authorization or real-world safety incident:

1. preserve relevant evidence with restricted access;
2. reduce ongoing harm (disable affected flow/account or revoke credentials);
3. verify scope through authoritative server logs;
4. notify responsible operators and legal/privacy contacts;
5. communicate accurately to affected members when required;
6. remediate, test regression coverage, and document follow-up actions.
