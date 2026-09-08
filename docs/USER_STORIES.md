# MVP user stories and acceptance criteria

_Last updated: 2026-09-08._

This is the traceability contract for the Invite MVP. A story can be **implemented** without being **fully automated**; those are intentionally separate columns.

Status values:

- **Implemented** — primary code path exists in the current hardening branch.
- **Partial** — useful behavior exists but an MVP acceptance criterion is missing.
- **Planned** — required by the MVP definition but not yet implemented.

## Account and identity

| ID | User story | Acceptance criteria | Status | Automated evidence target |
| --- | --- | --- | --- | --- |
| AUTH-01 | As a new member, I want to register with email/password so I can create an Invite account. | Valid email, 8+ character password; Firebase owns password; duplicate Firebase email is handled clearly. | Implemented | Android auth smoke + validation tests |
| AUTH-02 | As a new email member, I want to verify my email before creating a social profile. | Verification email can be sent/resend; unverified Firebase identity cannot provision MongoDB profile; verified state can be refreshed. | Implemented | Hosted Firebase boundary smoke; device flow still desirable |
| AUTH-03 | As a verified member, I want onboarding to create exactly one Invite profile. | Name/city/preferences validated; Firebase UID mapped to stable Invite user ID; provisioning is transactional. | Implemented | Hosted/API integration required |
| AUTH-04 | As a returning member, I want email/password sign-in to reopen the same Invite identity. | Valid credential signs in; invalid credential is generic; no duplicate member/mapping. | Implemented | Managed-auth invalid-login smoke; positive isolated E2E still required |
| AUTH-05 | As a member, I want to reset my forgotten password. | Reset request is available from sign-in; changing password does not create a new Invite member. | Implemented | Automated Firebase journey still required |
| AUTH-06 | As an Android member, I want Google Sign-In. | Native Google credential is exchanged for Firebase credential; Play-signed OAuth configuration is separate from direct-APK signing. | Implemented | Build/config smoke; controlled real-device provider smoke |
| AUTH-07 | As a member, I want my session restored after restart. | Firebase session restore resolves the same Invite member and reloads domain data; onboarding is not shown for a temporary API failure. | Partial | Android restart E2E required |
| AUTH-08 | As a member, I want logout to end managed identity/session state. | Invite session ends; Firebase session ends; native Google sign-in session is cleared when present. | Implemented | Android E2E required |
| AUTH-09 | As an existing member, I want email collisions handled safely. | Matching email alone never links identities; collision returns `ACCOUNT_LINK_REQUIRED`. | Implemented | Hosted/API integration regression required |
| AUTH-10 | As a signed-in member, I want backend outages distinguished from missing profiles. | Timeout/network/server errors show retryable unavailable state; only `INVITE_PROFILE_REQUIRED` routes to onboarding. | Implemented in hardening branch | Component/E2E regression required |
| AUTH-11 | As a member, I want a rejected/expired Invite API session to be recoverable. | 401/rejected session is not treated as profile absence; retry/sign-out path is visible. | Implemented in hardening branch | Component/E2E regression required |

## Profile and discovery

| ID | User story | Acceptance criteria | Status | Automated evidence target |
| --- | --- | --- | --- | --- |
| PROF-01 | As a member, I want a useful profile so people can decide whether to invite me. | Name, city, interests, availability, goals, headline and bio have validation; photo URL optional. | Implemented | Validation tests |
| PROF-02 | As a member, I want to edit my introduction/preferences. | Invalid changes are rejected; valid update persists through API for remote session. | Implemented | API integration + UI E2E required |
| DISC-01 | As a member, I want to find people through common ground. | Search covers useful profile fields; reasons can include shared interests/approximate distance. | Implemented | Discovery/matching unit tests |
| DISC-02 | As a member, I want filters that recover gracefully. | Interests, availability, goal, approximate distance and verification can combine; clear filters restores results. | Implemented | Discovery tests + UI smoke |
| DISC-03 | As a privacy-conscious member, I want approximate map discovery. | No exact home/live coordinates; broad area centroids; pin opens correct profile. | Implemented with limited city coverage | Unit/device review; geographic expansion decision required |
| TRUST-01 | As a member, I want verification labels I can understand. | Firebase-provisioned profile shield means verified primary email only; docs/copy do not imply ID/background verification. | Implemented in hardening branch | Content/unit review |
| TRUST-02 | As a new member, I do not want a default 100% value presented as proven reliability. | New members are labeled as new until enough attendance evidence exists. | Partial | UI regression required |

## Plans

| ID | User story | Acceptance criteria | Status | Automated evidence target |
| --- | --- | --- | --- | --- |
| PLAN-01 | As a host, I want to create a specific plan. | Future time, place, city, category, capacity 2–30, visibility, vibe, title and description required; host is first attendee. | Implemented | Validation + reducer + API integration |
| PLAN-02 | As a host, I want a clear staged creation workflow. | What/when/where/group/privacy/review are understandable and errors appear near the decision. | Partial | Android journey + usability review |
| PLAN-03 | As a host, I want to edit a future plan. | Only host can change allowed fields; capacity cannot become invalid; participants see updated state. | Planned | Server auth/integration + Android E2E |
| PLAN-04 | As a host, I want to cancel a future plan. | Host-only; cancelled state remains understandable; pending invitations/participants receive consistent state. | Planned | Server transaction/integration + Android E2E |
| PLAN-05 | As a member, I want to join a discoverable community plan. | Community only; space available; no duplicate attendance; server enforces final slot atomically. | Implemented | Reducer + API integration |
| PLAN-06 | As an attendee, I want to leave a plan I no longer can attend. | Non-host can leave; attendee removed once; host cannot leave without transferring/cancelling. | Planned | Server integration + Android E2E |
| PLAN-07 | As a member, I want cancelled/full/invite-only/past plans to be unmistakable. | Unavailable actions are disabled/explained and stale actions cannot succeed server-side. | Partial | UI + API integration |
| PLAN-08 | As a member, I want to save plans. | Save/unsave is scoped to authenticated member and persists remotely. | Implemented | Reducer + API integration |

## Invitations

| ID | User story | Acceptance criteria | Status | Automated evidence target |
| --- | --- | --- | --- | --- |
| INV-01 | As a host, I want recommended invitees with understandable reasons. | Host/current attendee/already invited excluded; recommendation reasons avoid sensitive traits. | Implemented | Matching tests |
| INV-02 | As a host, I want to send a short personal invitation. | Select one/many eligible people; message max 180 chars; no duplicate active invitation. | Implemented | Reducer + API integration |
| INV-03 | As an invitee, I want to accept without race-condition overbooking. | Receiver-only; acceptance and attendee insert are transactional; capacity enforced. | Implemented server behavior | Server concurrency/integration test required |
| INV-04 | As an invitee, I want to decline without pressure. | Receiver-only; decline does not add attendee; UI treats decline as normal. | Implemented | Reducer + API integration |
| INV-05 | As a host, I want to cancel a pending invitation. | Sender-only; only pending invitation can be cancelled. | Implemented | API integration required |
| INV-06 | As a member, I want received/sent history to remain understandable. | Pending first; status visible; missing/deleted related data does not crash the screen. | Partial | UI regression required |

## Safety, privacy and support

| ID | User story | Acceptance criteria | Status | Automated evidence target |
| --- | --- | --- | --- | --- |
| SAFE-01 | As a first-time attendee, I want contextual safety guidance. | Public-place/transport/leave-freely guidance appears in invitation/plan decision path. | Implemented | Content/device review |
| SAFE-02 | As a member, I want to block another member. | Blocked member cannot be recommended/contacted through normal Invite paths; block can be managed safely. | Planned / public-MVP requirement | API authorization + UI E2E |
| SAFE-03 | As a member, I want to report a member. | Reason/comment captured with minimal data; report persisted for operator review; reporting does not expose reporter publicly. | Planned / public-MVP requirement | API integration + UI E2E |
| SAFE-04 | As a member, I want to report a plan. | Plan/report IDs and reason persisted; operator can triage. | Planned / public-MVP requirement | API integration + UI E2E |
| PRIV-01 | As a member, I want to delete my account. | Authenticated deletion path; Firebase/app data handling follows documented retention policy; destructive confirmation required. | Planned / public-MVP requirement | API integration + UI E2E |
| HELP-01 | As a member, I want login/help documentation. | User guide, account help, FAQ and safety guide exist and match current product. | Implemented in hardening branch | Documentation check |
| HELP-02 | As an operator, I want support triage instructions. | Severity, login/identity rules, evidence handling and escalation documented. | Implemented in hardening branch | Documentation review |

## Cross-cutting acceptance criteria

- API authorization is authoritative; client guards are UX only.
- Firebase passwords never enter Invite API/MongoDB.
- MongoDB credentials/private signing credentials never enter the mobile bundle.
- Email equality never silently links identities.
- Exact member location is not required for discovery.
- Errors do not silently convert a failed remote write into local success.
- Destructive actions require clear confirmation.
- Interactive controls have visible/accessibility labels and practical touch targets.
- Loading, empty, unavailable and retry states are explicit.
- User-facing language prefers **plan**; internal code may retain `Activity`.
- Any waived test is documented as **waived/not executed**, not passed.

## Automation mapping

### Standard CI

`CI` runs typecheck, lint, Jest user-story/domain tests and production web export.

### MVP Quality Gate

`.github/workflows/mvp-quality.yml` adds:

- genuine Firebase ID-token boundary checks against the isolated staging API;
- rejection of unverified profile provisioning;
- Android managed-auth invalid-login smoke;
- clean-state demo/core navigation smoke on an API 35 emulator.

### Additional tests still required

The public MVP should add a server integration suite for authorization and transactional writes plus positive managed-auth journeys for verified onboarding, returning login, restart/session restore and multi-user invitation flows.

## Manual usability/accessibility review

Automation cannot fully judge wording, hierarchy or physical-device behavior. Before public launch, review at least:

1. clean install/welcome;
2. registration/verification/onboarding;
3. returning login/reset/Google provider;
4. plan creation and invitation flow;
5. invitation accept/decline;
6. profile/discovery filters/map;
7. error/offline states;
8. block/report/delete once implemented;
9. small/large Android layouts, large text and TalkBack labels;
10. Play-installed behavior on representative physical devices.
