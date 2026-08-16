# Testing strategy

## Quality gates

Every pull request runs five independent gates:

1. Strict TypeScript compilation
2. ESLint, including React Hooks purity/compiler rules
3. Jest story tests with coverage
4. A production static web export to catch bundling and route failures
5. A standalone Android build, embedded-bundle assertion, install, and startup smoke test

The native workflow builds with `assembleRelease` so the JavaScript runtime is embedded rather than fetched from Metro. It verifies the bundle inside the APK, installs the APK on an API 35 emulator, launches it without a development server, and fails unless the welcome screen replaces the splash logo within 60 seconds. Updates to `main` publish the verified APK and checksum to the `v1.0.1-preview.2` prerelease. The preview is development-signed; Play Store and iPhone releases require their platform signing credentials.

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

### User-story transitions

`app-reducer.test.ts` exercises creation, invitations, acceptance, decline, public joining, duplicate prevention, and saving. Pure reducer tests are fast and deterministic; remote security is independently enforced by SQL.

### Rendered application flows

`app-flow.test.tsx` mounts the real product screens and `AppProvider` with a deterministic router adapter. It verifies clean startup, demo entry, activity discovery, people search, invitation acceptance, and activity creation through the controls a member actually uses. AsyncStorage and device-only icon/haptic modules are replaced with deterministic test adapters.

### Installed Android startup

`mobile-preview.yml` builds the release Gradle target, asserts that `assets/index.android.bundle` is present and non-trivial, installs the APK on an emulator, and checks the Android accessibility tree for the welcome heading. This protects against accidentally publishing a debug APK that waits for Metro while displaying the splash screen.

## Required production-backend tests

The repository can run without Supabase credentials, so CI does not execute destructive integration tests. Before production release, add an ephemeral Supabase job that verifies:

- unauthenticated reads fail;
- one member cannot update another profile;
- invite-only activities are hidden from unrelated members;
- only a host can create invitations for an activity;
- a receiver can accept/decline but cannot cancel as sender;
- a sender can cancel but cannot accept for the receiver;
- simultaneous final-slot joins produce one success and one capacity failure;
- acceptance and attendee insertion roll back together when full;
- saved activities are private to their owner.

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

- Deeper Maestro flows on signed Android and iOS release candidates
- Supabase local integration suite in CI
- Accessibility tree assertions and screenshot contrast checks
- Bundle-size and cold-start budgets
- Performance profiling for long people/activity lists before pagination ships
