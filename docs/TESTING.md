# Testing strategy

## Quality gates

Every pull request runs five independent gates:

1. Strict TypeScript compilation
2. ESLint, including React Hooks purity/compiler rules
3. Jest story tests with coverage
4. A production static web export to catch bundling and route failures
5. An Android native preview build on every pull request and `main` update

The native workflow builds the Android release variant and fails unless `assets/index.android.bundle` is embedded in the APK. It then uploads the APK and SHA-256 checksum as GitHub Actions artifacts. Updates to `main` also publish them to the `v1.0.0-preview.5` prerelease for direct Android device testing. Preview 5 is compiled with the live Render API URL unless `INVITE_API_URL` overrides it. The preview is development-signed; Play Store and iPhone releases require their platform signing credentials.

Run the same checks locally:

```bash
npm run typecheck
npm run lint
npm run test:ci
npm run export:web -- --output-dir dist
```

## Automated test layers

### Runtime validation

`validation.test.ts` covers registration, profile completeness, activity copy, time, and group limits. These tests protect inputs at the boundary before state or remote writes.

### Recommendation behavior

`matching.test.ts` verifies that explanations use the declared signals and that ineligible profiles are excluded. It also protects a relevant ranking example. This suite should grow alongside fairness and location changes.

`profile-discovery.test.ts` verifies biography/area search, combined interests/availability/goals/verification/distance filters, approximate Haversine distance, and non-degenerate real-map bounds containing every broad-area point.

### User-story transitions

`app-reducer.test.ts` exercises creation, invitations, acceptance, decline, public joining, duplicate prevention, and saving. Pure reducer tests are fast and deterministic; remote security is independently enforced by SQL.

## Required production-backend tests

The repository can run without MongoDB credentials, so CI does not execute destructive integration tests. Before production release, add an ephemeral MongoDB replica-set job that verifies:

- unauthenticated reads fail;
- one member cannot update another profile;
- invite-only activities are hidden from unrelated members;
- only a host can create invitations for an activity;
- a receiver can accept/decline but cannot cancel as sender;
- a sender can cancel but cannot accept for the receiver;
- simultaneous final-slot joins produce one success and one capacity failure;
- acceptance and attendee insertion roll back together when full;
- saved activities are private to their owner.
- public profile responses never contain another member's email or password hash;
- malformed/expired JWTs fail and authentication rate limits activate;
- coarse `$near` results respect the requested maximum distance.

Run the same authorization suite against Supabase if that compatibility backend will remain enabled.

## Manual device matrix

At minimum, validate:

| Platform | Target                    | Focus                                                 |
| -------- | ------------------------- | ----------------------------------------------------- |
| iOS      | Small supported iPhone    | Text wrapping, keyboard, modal date picker            |
| iOS      | Current large iPhone      | Safe areas, tab reachability, haptics                 |
| Android  | Compact API 36 device     | Predictive back, keyboard resize, Material symbols    |
| Android  | Large API 36 device       | Responsive max width, date/time picker                |
| Web      | Current Chrome and Safari | Static routing, keyboard navigation, focus visibility |

Repeat with larger system text, dark system settings (the MVP intentionally stays light), reduced motion, VoiceOver/TalkBack, and poor network conditions.

## Acceptance evidence

Story IDs in [USER_STORIES.md](./USER_STORIES.md) map directly to test names. When a story changes, update its criteria and tests in the same pull request. A passing unit test is not evidence that a screen is usable: the manual checklist remains required for release candidates.

## Future automation

- React Native Testing Library tests for critical form/error rendering
- Maestro smoke flows on Android and iOS development builds
- Compatibility-backend integration suite if Supabase remains enabled
- Accessibility tree assertions and screenshot contrast checks
- Bundle-size and cold-start budgets
- Performance profiling for long people/activity lists before pagination ships
- MongoDB replica-set API integration tests and dependency/security scanning
