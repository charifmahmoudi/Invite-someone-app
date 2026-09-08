# MVP user stories and acceptance criteria

_Last updated: 2026-09-08._

This is the traceability contract for the Invite MVP. **Implemented** and **automated** are separate claims.

Status values:

- **Implemented** — primary product/API path exists on `impl/mvp-hardening`.
- **Partial** — useful behavior exists but an MVP acceptance criterion remains.
- **Planned** — required by the MVP definition but not yet implemented.

## Account and identity

| ID | User story | Acceptance criteria | Status | Automated evidence |
| --- | --- | --- | --- | --- |
| AUTH-01 | Register with email/password. | Firebase owns password; valid email/password; duplicate Firebase email handled clearly. | Implemented | Validation + Android auth smoke |
| AUTH-02 | Verify email before creating a social profile. | Unverified Firebase identity cannot provision MongoDB profile; verification can be refreshed/resend. | Implemented | Genuine Firebase boundary smoke |
| AUTH-03 | Onboard into exactly one Invite profile. | Preferences validated; Firebase UID maps to stable Invite ID; no duplicate identity mapping. | Implemented | Positive managed-auth E2E still required |
| AUTH-04 | Return with email/password to the same Invite identity. | Valid credentials open same member; invalid credential generic; no duplicate member. | Implemented | Invalid-login smoke; positive journey still required |
| AUTH-05 | Reset a forgotten password. | Firebase reset available; reset does not create a new Invite member. | Implemented | Positive Firebase journey still required |
| AUTH-06 | Sign in with Google on Android. | Native Google credential -> Firebase credential; OAuth package/SHA matches installed channel. | Implemented | Build/config + controlled real-device smoke |
| AUTH-07 | Restore session after restart. | Firebase session resolves same Invite member; outage does not route to onboarding. | Partial | Restart E2E required |
| AUTH-08 | Log out. | Invite/Firebase/native Google session state ends as applicable. | Implemented | Android E2E required |
| AUTH-09 | Handle existing-email collision safely. | Email equality never links; collision remains `ACCOUNT_LINK_REQUIRED`. | Implemented | Hosted/API regression required |
| AUTH-10 | Distinguish backend outage from missing profile. | Only `INVITE_PROFILE_REQUIRED` routes to onboarding; network/server errors are retryable. | Implemented | Auth-state regression required |
| AUTH-11 | Recover from rejected/expired Invite API session. | 401/rejected session has retry/sign-out path and is not profile absence. | Implemented | Auth-state regression required |

## Profile and discovery

| ID | User story | Acceptance criteria | Status | Automated evidence |
| --- | --- | --- | --- | --- |
| PROF-01 | Create a useful profile. | Name, city, interests, availability, goals, headline/bio validated. | Implemented | Validation tests |
| PROF-02 | Edit profile/preferences. | Valid updates persist; invalid changes rejected. | Implemented | API/UI regression still desirable |
| DISC-01 | Find people through common ground. | Search/reasons use non-sensitive profile/plan signals. | Implemented | Discovery/matching tests |
| DISC-02 | Filter discovery. | Interest/availability/goal/distance/verification combinations recover cleanly. | Implemented | Discovery tests + UI smoke |
| DISC-03 | Use approximate-area discovery. | No exact home/live coordinates; broad area centroids. | Implemented with limited city coverage | Geographic scope decision still required |
| TRUST-01 | Understand verification. | Shield means verified primary email only; no ID/background implication. | Implemented | Content review |
| TRUST-02 | Avoid unsupported reliability claims. | New members without enough attendance evidence are labelled new. | Implemented on principal profile/person/plan surfaces | UI regression |

## Plans

| ID | User story | Acceptance criteria | Status | Automated evidence |
| --- | --- | --- | --- | --- |
| PLAN-01 | Create a specific plan. | Future time, place, category, capacity 2–30, visibility, vibe, title/description; host first attendee. | Implemented | Validation + reducer + Android journey |
| PLAN-02 | Use a clear creation workflow. | Fields grouped clearly; errors actionable; review/staging can be understood. | Partial | Android journey + usability review |
| PLAN-03 | Edit a future hosted plan. | Host-only; only editable fields change; capacity cannot drop below attendance; cancelled/past plans reject edit. | **Implemented** | Server integration + reducer + Android lifecycle journey |
| PLAN-04 | Cancel a future hosted plan. | Host-only soft cancellation; history retained; pending invitations cancelled; no new join/invite. | **Implemented** | Server integration + reducer + Android lifecycle journey |
| PLAN-05 | Join a community plan. | Community only; capacity available; no duplicate attendance; server owns final decision. | Implemented | Reducer + API integration + Android safety journey |
| PLAN-06 | Leave a plan as a non-host attendee. | Attendee removed once; host cannot leave own plan; past plan rejected. | **Implemented** | Server integration + reducer + Android safety journey |
| PLAN-07 | Understand cancelled/full/invite-only states. | Unavailable actions hidden/explained; stale mutation rejected server-side. | **Implemented for current lifecycle states** | Server integration + Android lifecycle journey |
| PLAN-08 | Save/unsave plans privately. | Saved state scoped to authenticated member; blocked/cancelled safety rules apply. | Implemented | Reducer + API integration |

## Invitations

| ID | User story | Acceptance criteria | Status | Automated evidence |
| --- | --- | --- | --- | --- |
| INV-01 | Get understandable invitee recommendations. | Host/current attendee/already invited excluded; reasons avoid sensitive traits. | Implemented | Matching tests |
| INV-02 | Send a personal invitation. | Eligible people only; note max 180 chars; no duplicate active invitation; blocked pairs rejected. | Implemented | Server integration includes blocked-pair rejection |
| INV-03 | Accept without overbooking. | Receiver-only; capacity/transaction remain authoritative. | Implemented server behavior | Dedicated concurrency test still desirable |
| INV-04 | Decline without pressure. | Receiver-only; no attendee insertion; decline is normal. | Implemented | Reducer/API coverage |
| INV-05 | Cancel a pending sent invitation. | Sender-only; pending only. | Implemented | API integration still desirable |
| INV-06 | Understand sent/received history. | Status visible; related missing data does not crash. | Partial | UI regression |

## Safety, privacy and support

| ID | User story | Acceptance criteria | Status | Automated evidence |
| --- | --- | --- | --- | --- |
| SAFE-01 | See contextual first-meeting safety guidance. | Public place/transport/leave-freely guidance appears in plan decisions. | Implemented | Content/device review |
| SAFE-02 | Block another member. | Self-block rejected; blocked peers removed from normal discovery; pending invitations cancelled; new invitations prevented; block privately manageable/unblockable. | **Implemented** | Server integration + Android report/block journey |
| SAFE-03 | Report a member. | Structured reason/optional detail; server derives reporter; report persisted with reference; no public disclosure. | **Implemented** | Server integration + Android report journey |
| SAFE-04 | Report a plan. | Plan ID/reason persisted with authenticated reporter and operator-review status. | **Implemented** | Server integration; plan-report UI present |
| PRIV-01 | Delete my account. | Authenticated deletion; retention/deletion propagation documented; destructive confirmation. | **Planned / remaining public-MVP P0** | API + UI E2E required |
| HELP-01 | Get accurate login/product/safety help. | User guide, login help, FAQ, safety guide match current branch. | Implemented | Documentation review |
| HELP-02 | Give operators a support process. | Severity, identity protections, evidence handling, reporting escalation documented. | Implemented | Support + moderation runbooks |

## Cross-cutting acceptance criteria

- API authorization is authoritative; client guards are UX only.
- Firebase passwords never enter Invite API/MongoDB.
- MongoDB/signing secrets never enter the mobile bundle.
- Email equality never silently links identities.
- Exact member location is not required for discovery.
- Failed remote writes never become silent local success.
- Destructive actions require confirmation.
- Blocking is private and does not reveal the blocker.
- Reporter identity is derived from the authenticated server session, never client-supplied.
- User-facing language prefers **plan**; internal code may retain `Activity`.
- Any waived test is recorded as **waived/not executed**, not passed.

## Automation mapping

### Standard CI

`CI` runs typecheck, lint, Jest user-story/domain tests, and production web export.

### MVP Quality Gate

`.github/workflows/mvp-quality.yml` runs:

1. genuine Firebase ID-token boundary checks;
2. an isolated MongoDB/API integration suite for lifecycle and safety authorization;
3. Android managed-auth plus demo product journeys.

The server integration suite exercises real HTTP requests and verifies:

- non-host edit/cancel rejection;
- host edit/cancel success;
- host leave rejection;
- attendee leave;
- attendance-based capacity floor;
- cancelled join/invite rejection;
- self-block rejection;
- block discovery/invitation enforcement;
- unblock behavior;
- profile/plan reporting;
- forged client `reporterId` ignored in persisted moderation record.

Android demo journeys cover:

```text
create plan -> edit title -> verify update -> cancel
join community plan -> leave
report profile -> receive reference -> block profile
```

The Firebase boundary and local/demo journeys intentionally do not mutate production.

### Managed-auth automation still required

Before a production decision, add positive isolated journeys for:

- verified onboarding;
- returning email/password sign-in;
- restart/session restore;
- password reset;
- multi-user Firebase invitation/acceptance;
- repeated login preserving one Invite identity;
- `ACCOUNT_LINK_REQUIRED` on a controlled collision fixture.

## Manual usability/accessibility review

Automation does not fully judge wording, hierarchy, physical-device behavior, or accessibility. Before public launch, review:

1. clean install/welcome;
2. registration/verification/onboarding;
3. returning login/reset/Google provider;
4. create/edit/cancel/join/leave plan;
5. invite accept/decline;
6. people filters/map;
7. error/offline states;
8. report/block/unblock/account deletion;
9. large text/TalkBack and practical touch targets;
10. Play-installed behavior on representative devices.
