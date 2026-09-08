# User stories and acceptance criteria

The implemented MVP stories are numbered so product behavior, code, and automated tests remain traceable. Automated test names start with the relevant story ID.

| ID    | User story                                                                                                             | Acceptance criteria                                                                                                                                                                                                        | Implementation                                                               | Automated coverage                              |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| US-01 | As a new member, I want to create an account and state my preferences so that invitations are relevant.                | Name, valid email, 8+ character password, city, 2+ interests, availability, and a connection goal are required. MongoDB mode hashes passwords server-side; preview mode stores no password.                                | `/(auth)/sign-up`, `signUpSchema`, `AppProvider.signUp`, API registration    | `validation.test.ts`                            |
| US-02 | As a member, I want to update my introduction and preferences so that my profile stays accurate.                       | Name, photo URL, useful headline/bio, city, 2+ interests, availability, and goals can be edited; invalid changes are not saved.                                                                                            | `/profile/edit`, `profileUpdateSchema`, API profile update                   | `validation.test.ts`, strict types              |
| US-03 | As a member, I want to discover compatible local people without opaque or sensitive profiling.                         | Search covers names, handles, biographies, interests, availability, goals, city, and broad area. Suggestions show shared-interest and approximate-distance reasons; sensitive traits are excluded.                         | `/(tabs)/people`, `domain/profile-discovery.ts`, `domain/matching.ts`        | `profile-discovery.test.ts`, `matching.test.ts` |
| US-04 | As a host, I want to create a specific activity so that people can confidently decide.                                 | A future time, location, city, category, 2–30 capacity, visibility, vibe, title, and description are required. The host is the first attendee.                                                                             | `/create`, `activityDraftSchema`, `createActivity`                           | `validation.test.ts`, `app-reducer.test.ts`     |
| US-05 | As a host, I want recommended invitees and a personal note so that outreach feels thoughtful.                          | Host sees eligible suggestions with reasons, can search/select several people, writes up to 180 characters, and does not create duplicate active invitations. Host/current attendees/already-invited members are excluded. | `/invite/[activityId]`, `recommendProfiles`, `sendInvitations`               | `matching.test.ts`, `app-reducer.test.ts`       |
| US-06 | As an invitee, I want to accept or decline without pressure so that I control participation.                           | Pending invitations appear in Received. Accepting adds the member once; declining does not. Hosts can cancel pending invitations. Capacity is enforced transactionally in production.                                      | `/(tabs)/invitations`, `/activity/[id]`, invitation reducer, API transaction | `app-reducer.test.ts`                           |
| US-07 | As a member, I want to join discoverable activities so that I can participate without a direct invite.                 | Only community activities with space can be joined. A member cannot be added twice. Invite-only activities require an accepted invitation.                                                                                 | `/activity/[id]`, `joinActivity`, atomic API capacity update                 | `app-reducer.test.ts` plus database constraints |
| US-08 | As a member, I want to save activities so that I can revisit them.                                                     | Save state toggles immediately, persists locally, and is scoped to the authenticated member in production.                                                                                                                 | Activity cards/details, `saved_activities`, `toggleSavedActivity`            | `app-reducer.test.ts`                           |
| US-09 | As a member, I want to see who is hosting and attending so that a plan feels trustworthy.                              | Activity details show the host, reliability indicator, attendee count, capacity, and visible attendees. Profiles are navigable.                                                                                            | `/activity/[id]`, `/person/[id]`                                             | Type-check and manual acceptance checklist      |
| US-10 | As a first-time attendee, I want timely safety guidance so that I can make a comfortable decision.                     | Invitation and activity screens advise meeting publicly, maintaining transport options, notifying someone, and leaving freely.                                                                                             | Invitations and activity detail safety callouts                              | Manual content review                           |
| US-11 | As a member, I want meaningful filters so that I can find people who fit the plan I have in mind.                      | Filters combine multiple interests, availability, connection goal, approximate distance, and verification; a member can clear all filters and recover gracefully from no results.                                          | `/(tabs)/people`, `discoverProfiles`                                         | `profile-discovery.test.ts`                     |
| US-12 | As a privacy-conscious member, I want an approximate people map so that I understand proximity without exposing homes. | List/map views use only broad public-area centroids, clearly label pins as approximate, require no live-location permission, and open the selected member profile.                                                         | `PeopleMap`, `projectProfilesForMap`, profile area labels                    | `profile-discovery.test.ts` plus device review  |
| US-13 | As a member, I want to see a person's photo and introduction before inviting them so that outreach feels comfortable.  | Cards and details show a photo with initials fallback, biography, trust/compatibility context, and an explicit path to invite them to an existing plan or create a new one.                                                | `Avatar`, `ProfileCard`, `/person/[id]`, `/profile/edit`                     | Strict types plus manual device review          |

## Testable acceptance scenarios

Scenario IDs are stable evidence keys. A story is verified only when every scenario is covered at the declared test layer and its required Android screenshots are produced by the same passing GitHub Actions run. `API` means an integration test against isolated MongoDB; `E2E` means a Maestro flow on the Android emulator.

### US-01 — Account creation and onboarding

#### US-01-AC-01 — Validate registration input

- **Given** a new member is on registration
- **When** they submit an invalid email, a password shorter than eight characters, or fewer than two interests
- **Then** submission is blocked and each actionable validation message is visible
- **Evidence:** unit + E2E; screenshot of asserted validation state

#### US-01-AC-02 — Provision a verified member

- **Given** a Firebase identity with a verified email and no Invite identity mapping
- **When** the member supplies all required profile preferences
- **Then** the API creates exactly one member and identity mapping and opens the authenticated app
- **Evidence:** API + E2E; screenshots of completed onboarding and authenticated home

#### US-01-AC-03 — Preserve identity and reject unsafe linking

- **Given** an existing Firebase mapping or an unmapped identity whose email belongs to a legacy member
- **When** authentication or provisioning is repeated
- **Then** the mapped identity resolves to the same Invite member and email equality alone returns `ACCOUNT_LINK_REQUIRED`
- **Evidence:** API + E2E; screenshot of the actionable collision state

### US-02 — Profile editing

#### US-02-AC-01 — Save valid profile changes

- **Given** an authenticated member opens profile editing
- **When** they update their name, introduction, city, interests, availability, goals, or HTTPS photo URL with valid values
- **Then** the saved profile appears consistently on profile, feed, and people screens
- **Evidence:** unit + API + E2E; before-and-after profile screenshots

#### US-02-AC-02 — Reject invalid or unauthorized changes

- **Given** a member submits invalid profile data or attempts to update another member
- **When** the request is validated
- **Then** no invalid change is persisted and unauthorized access is rejected
- **Evidence:** unit + API + E2E; screenshot of asserted validation feedback

### US-03 — Compatible people discovery

#### US-03-AC-01 — Search public profile context

- **Given** seeded members with distinct names, handles, biographies, interests, availability, goals, cities, and broad areas
- **When** the active member searches using any supported public field
- **Then** matching profiles appear and unrelated profiles do not
- **Evidence:** unit + API + E2E; screenshot of asserted search results

#### US-03-AC-02 — Explain recommendations without sensitive traits

- **Given** compatible and incompatible seeded profiles
- **When** recommendations are displayed
- **Then** ordering and visible reasons use shared interests, availability, goals, trust, and approximate distance without exposing private or sensitive traits
- **Evidence:** unit + API + E2E; screenshot showing recommendation reasons

### US-04 — Activity creation

#### US-04-AC-01 — Validate a complete future plan

- **Given** an authenticated host opens activity creation
- **When** required text, category, future date/time, location, city, capacity, visibility, or vibe is absent or invalid
- **Then** creation is blocked with actionable field feedback
- **Evidence:** unit + E2E; screenshot of asserted validation state

#### US-04-AC-02 — Create one authorized activity

- **Given** a valid activity draft with capacity from 2 through 30
- **When** the host submits it once
- **Then** one activity is persisted, the creator is its host and first attendee, and its visibility is enforced
- **Evidence:** unit + API + E2E; screenshots of completed form and created detail

### US-05 — Thoughtful invitations

#### US-05-AC-01 — Recommend only eligible invitees

- **Given** an activity with a host, attendees, previously invited members, and eligible compatible members
- **When** the host opens invitee selection
- **Then** only eligible members appear with transparent recommendation reasons and can be searched and selected
- **Evidence:** unit + API + E2E; screenshot of asserted recommendations

#### US-05-AC-02 — Send personal, non-duplicate invitations

- **Given** selected eligible invitees and a note no longer than 180 characters
- **When** the host sends invitations or repeats the same request
- **Then** one active invitation per receiver exists and the Sent view presents the note and pending state
- **Evidence:** unit + API + E2E; screenshots before send and in Sent

### US-06 — Invitation decisions

#### US-06-AC-01 — Accept or decline as receiver

- **Given** a pending invitation addressed to the active member
- **When** they accept or decline it
- **Then** the state changes once; acceptance adds them once to an activity with capacity, while decline leaves attendance unchanged
- **Evidence:** unit + API + E2E; screenshots of pending and terminal states

#### US-06-AC-02 — Cancel and authorize transitions

- **Given** pending and completed invitations across unrelated users
- **When** a sender cancels or an unauthorized actor attempts a transition
- **Then** only the sender can cancel a pending invitation and all unauthorized or repeated transitions fail without changing attendance
- **Evidence:** API + E2E; screenshot of sender cancellation state

### US-07 — Community activity joining

#### US-07-AC-01 — Join an eligible community activity once

- **Given** a visible community activity with remaining capacity
- **When** a non-attending member joins, including a repeated or concurrent attempt
- **Then** the member appears once and capacity is never exceeded
- **Evidence:** unit + API concurrency + E2E; screenshot of joined state

#### US-07-AC-02 — Reject ineligible joins

- **Given** a full, invite-only, private, past, or already-joined activity
- **When** a member attempts to join
- **Then** the UI does not offer an invalid success path and the API rejects direct invalid requests
- **Evidence:** API + E2E; screenshot of an asserted unavailable state

### US-08 — Saved activities

#### US-08-AC-01 — Persist a member-scoped save

- **Given** an authenticated member views an activity
- **When** they save it and restart or sign out and back in
- **Then** the activity remains saved only for that member and can be removed once
- **Evidence:** unit + API + E2E; screenshots before save and after restoration

#### US-08-AC-02 — Report failed remote persistence honestly

- **Given** the remote API is unavailable
- **When** a production-mode save mutation fails
- **Then** the app displays an actionable error and does not retain a false successful state
- **Evidence:** API failure injection + E2E; screenshot of asserted recovery state

### US-09 — Host and attendee trust context

#### US-09-AC-01 — Present authorized attendance context

- **Given** a visible activity with a host and attendees
- **When** a member opens its details
- **Then** host identity, reliability context, attendee count, capacity, and permitted attendee profiles are visible and navigable
- **Evidence:** API + E2E; screenshots of activity trust context and opened profile

#### US-09-AC-02 — Protect restricted attendance

- **Given** an unrelated member and an invite-only or private activity
- **When** the member requests the activity or attendee details
- **Then** restricted data is not returned or rendered
- **Evidence:** API + E2E; screenshot of asserted not-available state where applicable

### US-10 — First-meeting safety guidance

#### US-10-AC-01 — Show guidance at decision points

- **Given** a member is deciding whether to accept an invitation or attend an activity
- **When** the relevant invitation or activity screen is displayed
- **Then** visible guidance advises meeting publicly, retaining transport options, notifying someone, and leaving freely
- **Evidence:** component/content assertion + E2E; screenshots at both decision points

### US-11 — Combined discovery filters

#### US-11-AC-01 — Combine filters deterministically

- **Given** seeded profiles that differ by interests, availability, goal, approximate distance, and verification
- **When** the member combines filters
- **Then** only profiles satisfying every active filter appear and list/map counts agree
- **Evidence:** unit + API + E2E; screenshot of active filters and asserted results

#### US-11-AC-02 — Recover from no results

- **Given** filters that produce no matches
- **When** the member clears all filters
- **Then** the empty state is useful and the unfiltered eligible set returns
- **Evidence:** unit + E2E; screenshots of empty and recovered states

### US-12 — Approximate people map

#### US-12-AC-01 — Use coarse, navigable map projections

- **Given** discoverable profiles with broad public-area centroids
- **When** the member opens the map and selects a pin
- **Then** the pin is labelled approximate, opens the correct profile, and list/map results remain consistent
- **Evidence:** unit + API + E2E; screenshots of map and selected profile

#### US-12-AC-02 — Avoid precise-location collection and exposure

- **Given** a clean Android installation
- **When** people discovery and its map are used
- **Then** no live-location permission is requested and no exact home coordinates or private location fields are returned
- **Evidence:** API privacy test + E2E permission assertion; screenshot of the approximate-area disclosure

### US-13 — Profile context before inviting

#### US-13-AC-01 — Present identity and invitation paths

- **Given** profiles with and without valid photo URLs and an eligible activity
- **When** the member opens a person card and profile
- **Then** a photo or initials fallback, introduction, trust/compatibility context, and a path to invite to an existing or new plan are visible
- **Evidence:** component + E2E; screenshots of fallback and full profile states

#### US-13-AC-02 — Prevent ineligible invitation paths

- **Given** the active member, an existing attendee, or an already-invited person
- **When** their profile is opened from discovery
- **Then** the app does not offer an invalid invitation action and direct API attempts remain rejected
- **Evidence:** API + E2E; screenshot of the asserted ineligible state

## Cross-cutting acceptance criteria

- Android, iOS, and web use one typed route and component model.
- All interactive controls have a label or visible text and a minimum practical touch target.
- Loading and errors do not silently discard an action.
- Demo mode is visually identified and never represented as production authentication.
- The service-role key is never accepted by client configuration.
- Private activities are visible only to their host, attendees, and invited members under production authorization rules.
- MongoDB credentials never enter the mobile bundle; API tokens use secure native storage.
- Approximate map coordinates represent shared area centroids and never exact member positions.

## Manual acceptance checklist

1. Open a clean install and verify that the welcome screen is reachable without network credentials.
2. Complete local signup with keyboard navigation and intentionally trigger each validation state.
3. Open demo mode, filter activities, save a card, close/reopen, and confirm persistence.
4. Create a plan with date/time, capacity, vibe, and invite-only visibility.
5. Select recommended people, send a note, and confirm the sent invitation state.
6. Accept a received invitation and confirm the member appears once in attendees.
7. Decline another invitation and confirm the activity attendee list is unchanged.
8. Join a public activity and verify full/invite-only plans cannot be joined.
9. Edit the active profile and verify all feed/person screens show the update.
10. Check small and large iPhone/Android viewport sizes, dynamic text enlargement, VoiceOver/TalkBack labels, and color contrast.
11. Search profile biographies, combine filters, clear an empty result, and verify list/map counts match.
12. Tap every approximate map pin and confirm it opens the correct profile without requesting location permission.
13. Disconnect the API, confirm the error is actionable, reconnect, and verify no remote mutation was shown as successful while offline.
