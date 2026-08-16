# User stories and acceptance criteria

The implemented MVP stories are numbered so product behavior, code, and automated tests remain traceable. Automated test names start with the relevant story ID.

| ID    | User story                                                                                              | Acceptance criteria                                                                                                                                                                                                        | Implementation                                                                     | Automated coverage                              |
| ----- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| US-01 | As a new member, I want to create an account and state my preferences so that invitations are relevant. | Name, valid email, 8+ character password, city, 2+ interests, availability, and a connection goal are required. Production mode uses Supabase Auth; preview mode stores no password.                                       | `/(auth)/sign-up`, `signUpSchema`, `AppProvider.signUp`                            | `validation.test.ts`                            |
| US-02 | As a member, I want to update my introduction and preferences so that my profile stays accurate.        | Name, useful headline/bio, city, 2+ interests, availability, and goals can be edited; invalid changes are not saved.                                                                                                       | `/profile/edit`, `profileUpdateSchema`, Supabase profile update                    | `validation.test.ts`, strict types              |
| US-03 | As a member, I want to discover compatible local people without opaque or sensitive profiling.          | Search covers people, city, headline, and interests. Suggestions show reasons. Scoring uses activity category, shared interests, city, and reliability only.                                                               | `/(tabs)/people`, `domain/matching.ts`                                             | `matching.test.ts`                              |
| US-04 | As a host, I want to create a specific activity so that people can confidently decide.                  | A future time, location, city, category, 2–30 capacity, visibility, vibe, title, and description are required. The host is the first attendee.                                                                             | `/create`, `activityDraftSchema`, `createActivity`                                 | `validation.test.ts`, `app-reducer.test.ts`     |
| US-05 | As a host, I want recommended invitees and a personal note so that outreach feels thoughtful.           | Host sees eligible suggestions with reasons, can search/select several people, writes up to 180 characters, and does not create duplicate active invitations. Host/current attendees/already-invited members are excluded. | `/invite/[activityId]`, `recommendProfiles`, `sendInvitations`                     | `matching.test.ts`, `app-reducer.test.ts`       |
| US-06 | As an invitee, I want to accept or decline without pressure so that I control participation.            | Pending invitations appear in Received. Accepting adds the member once; declining does not. Hosts can cancel pending invitations. Capacity is enforced transactionally in production.                                      | `/(tabs)/invitations`, `/activity/[id]`, invitation reducer, database triggers/RLS | `app-reducer.test.ts`                           |
| US-07 | As a member, I want to join discoverable activities so that I can participate without a direct invite.  | Only community activities with space can be joined. A member cannot be added twice. Invite-only activities require an accepted invitation.                                                                                 | `/activity/[id]`, `joinActivity`, attendee RLS/capacity trigger                    | `app-reducer.test.ts` plus database constraints |
| US-08 | As a member, I want to save activities so that I can revisit them.                                      | Save state toggles immediately, persists locally, and is scoped to the authenticated member in production.                                                                                                                 | Activity cards/details, `saved_activities`, `toggleSavedActivity`                  | `app-reducer.test.ts`                           |
| US-09 | As a member, I want to see who is hosting and attending so that a plan feels trustworthy.               | Activity details show the host, reliability indicator, attendee count, capacity, and visible attendees. Profiles are navigable.                                                                                            | `/activity/[id]`, `/person/[id]`                                                   | Type-check and manual acceptance checklist      |
| US-10 | As a first-time attendee, I want timely safety guidance so that I can make a comfortable decision.      | Invitation and activity screens advise meeting publicly, maintaining transport options, notifying someone, and leaving freely.                                                                                             | Invitations and activity detail safety callouts                                    | Manual content review                           |

## Cross-cutting acceptance criteria

- Android, iOS, and web use one typed route and component model.
- All interactive controls have a label or visible text and a minimum practical touch target.
- Loading and errors do not silently discard an action.
- Demo mode is visually identified and never represented as production authentication.
- The service-role key is never accepted by client configuration.
- Private activities are visible only to their host and invited members under production Row Level Security.

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
