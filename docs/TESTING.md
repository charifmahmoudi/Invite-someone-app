# Testing strategy and CI/E2E architecture

## Purpose

Invite uses multiple test layers because no single layer can prove product behavior, server authorization, database concurrency and native usability at once.

The intended hierarchy is:

```text
                 few, high-value
             ┌────────────────────┐
             │ Device E2E         │
             │ Maestro + emulator │
             ├────────────────────┤
             │ API integration    │
             │ auth + Mongo       │
             ├────────────────────┤
             │ Component tests    │
             │ critical UI states │
             ├────────────────────┤
             │ Domain/unit tests  │
             │ reducer/validation │
             ├────────────────────┤
             │ Static/build gates │
             │ TS/lint/export     │
             └────────────────────┘
                 many, very fast
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the application trust boundaries.

## Current CI gates

The `CI` workflow runs:

1. `npm ci`;
2. strict application and server TypeScript compilation;
3. ESLint;
4. Jest domain/user-story tests with configured coverage;
5. a production Expo web export.

The workflow runs on `main`, pull requests, the temporary architecture staging branch while this migration is being verified, and may also be started manually.

The mobile preview workflow independently builds the Android release variant, verifies that the embedded JavaScript bundle exists, uploads the APK/checksum, and publishes the development-signed preview from `main`.

Run the fast gates locally with:

```bash
npm run typecheck
npm run lint
npm run test:ci
npm run export:web -- --output-dir dist
```

## Existing automated tests

### Validation

`validation.test.ts` protects registration/profile/activity validation at the client/domain boundary.

### Matching and discovery

`matching.test.ts` verifies declared matching signals, eligibility rules and explanations.

`profile-discovery.test.ts` verifies text/area discovery, combined filters, approximate distance calculations and bounded map projection.

### State transitions

`app-reducer.test.ts` covers activity creation, invitations, acceptance, decline, public joining, duplicate prevention and saved activities.

These tests are fast and deterministic, but they do **not** prove API authorization or MongoDB concurrency behavior.

## API integration layer

Before a public production release, CI should run the server against an isolated MongoDB environment that supports transactions. Required scenarios include:

- unauthenticated protected requests fail;
- malformed, expired, wrong-issuer and wrong-audience identity tokens fail;
- a member cannot update another profile;
- invite-only activities are hidden from unrelated members;
- only a host can send invitations for an activity;
- receiver/sender permissions are enforced for invitation responses;
- simultaneous final-slot joins produce one success and one capacity failure;
- invitation acceptance and attendee insertion roll back together;
- saved activities are private;
- public profiles do not leak other members' email/auth fields;
- geospatial queries respect their maximum distance;
- Clerk provider subjects resolve to the correct internal Invite user;
- one external identity cannot silently become another Invite user.

This integration suite is still to be implemented. It requires an isolated MongoDB transaction-capable test environment.

## Device E2E architecture

The target CI environment is:

```text
GitHub Actions
      |
      v
Android emulator
      |
      v
Invite E2E APK
      |
      +------> Clerk development/test instance
      |
      v
Invite E2E API
      |
      v
MongoDB E2E database
```

The production API/database must never be the default E2E target.

### Implemented emulator foundation

The repository now contains:

```text
.maestro/auth/sign-in-internal.yaml
.github/workflows/e2e-android.yml
```

The manual Android workflow:

- requires an explicit workflow `api_url` or repository variable `INVITE_E2E_API_URL`;
- refuses the known Render production/demo API URL;
- builds a release APK with that E2E API URL embedded;
- boots an Android emulator;
- installs the APK;
- runs the Maestro sign-in smoke flow;
- uploads available Maestro evidence.

Until Clerk project configuration is provided, this compatibility smoke uses the seeded internal test account:

```text
demo@invite.app
invite-demo
```

This is transitional. The workflow is manual-only so an unprovisioned E2E environment cannot break ordinary CI.

## Target Clerk E2E authentication

Once the Expo client is switched to Clerk, automated device tests should use Clerk development/test identities rather than Google or Apple provider UI.

Recommended identities:

```text
e2e-host+clerk_test@example.com
e2e-guest+clerk_test@example.com
e2e-third+clerk_test@example.com
```

Clerk development/test mode provides deterministic test verification code:

```text
424242
```

The emulator should type the email and verification code into the real application authentication UI. Clerk then issues a normal development session/token, and the Invite API verifies that token through its normal Clerk/JWKS boundary.

**Do not add an Invite `E2E_BYPASS_AUTH` code path.** `424242` belongs to Clerk's test environment; it must never become a magic code implemented in Invite.

### Why routine CI should not automate Google/Apple login

Provider UI is brittle under automation because it may introduce:

- consent screen changes;
- CAPTCHA/bot detection;
- suspicious-login challenges;
- MFA/device verification;
- provider-specific rate limits.

Use Clerk email-code test identities for routine CI. Test Google/Apple provider configuration separately as targeted release smoke checks.

## E2E personas and data

Maintain a small deterministic set of ordinary members:

```text
HOST
  e2e-host+clerk_test@example.com
  Berlin
  coffee, hiking

GUEST
  e2e-guest+clerk_test@example.com
  Berlin
  coffee, photography

THIRD
  e2e-third+clerk_test@example.com
  Potsdam
  cycling
```

They are normal members, not privileged administrators.

Routine test runs should preserve stable authentication identities but reset/reseed the isolated application scenario:

```text
preserve:
  Clerk test identities
  stable Invite identity mappings if desired

reset/reseed:
  profiles to fixture values
  activities
  invitations
  saved activities
  future attendance/reputation records
```

Never run a destructive reset against production.

## Stable UI selectors

Critical E2E controls use React Native `testID`s rather than depending only on mutable copy.

Implemented selectors include:

```text
welcome-screen
welcome-sign-in
auth-sign-in-screen
auth-email
auth-password
auth-submit
auth-error
```

When Clerk OTP UI is introduced, add:

```text
auth-code
auth-verify
```

Use human-visible copy for assertions only when the copy itself is part of the behavior under test.

## High-value E2E journeys

After the isolated Clerk/Mongo E2E environment exists, prioritize these flows:

1. email-code sign-in and session restoration;
2. host creates a community activity;
3. host discovers a guest and sends an invitation;
4. guest signs in and accepts the invitation;
5. accepted guest appears as an attendee;
6. final-slot capacity cannot be overbooked;
7. invite-only activity stays invisible to unrelated third user;
8. save/unsave persists;
9. profile edits persist;
10. unauthorized actions are unavailable in UI and rejected by API.

A representative multi-user scenario is:

```text
reset E2E fixture
  -> sign in HOST
  -> create activity
  -> invite GUEST
  -> sign out
  -> sign in GUEST
  -> accept invitation
  -> assert attendee state
```

That one journey exercises native UI, authentication, API authorization, MongoDB transactions and client refresh behavior.

## Secrets and public configuration

| Value | Secret? | Location |
| --- | --- | --- |
| E2E API URL | no | workflow input/repository variable |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | no, public by design | E2E app build |
| Clerk server secret | yes | E2E/production server or trusted CI only |
| E2E MongoDB URI | yes | E2E server/trusted CI only |
| production MongoDB URI | yes | production server only |

Never expose server credentials through an `EXPO_PUBLIC_*` variable.

Privileged workflows must not execute untrusted fork code with repository secrets.

## Cold-start behavior

Free/scale-to-zero hosting can introduce a slow first request. Read paths may use bounded timeout/retry behavior, and E2E waits may allow a cold-start window.

Do not blindly retry writes such as activity creation or invitation acceptance until those operations have explicit idempotency guarantees.

The current sign-in smoke allows up to 60 seconds for the authenticated Plans tab to become visible so an isolated free-tier API can wake without masking a permanent failure.

## Failure evidence

Device jobs should retain enough evidence to debug failures:

- Maestro test output/artifacts;
- screenshots generated by Maestro;
- commit/build identifier;
- target environment identifier;
- API correlation IDs once request logging is implemented.

Do not print bearer tokens, Clerk secret keys, MongoDB URIs or reset credentials to logs.

## Manual release matrix

Automated E2E does not replace release-device testing.

| Platform | Target | Focus |
| --- | --- | --- |
| iOS | small supported iPhone | keyboard, wrapping, date picker, Apple login |
| iOS | large current iPhone | safe areas, haptics, session restoration |
| Android | compact supported device | predictive back, keyboard, native auth |
| Android | large device | responsive layout, date/time picker |
| Web | Chrome and Safari | static routing, keyboard/focus, browser auth callback |

Repeat important flows with larger system text, reduced motion, VoiceOver/TalkBack and poor network conditions.

## Implementation sequence

1. **Implemented:** fast CI static/domain/build gates.
2. **Implemented:** stable selectors for the current sign-in flow.
3. **Implemented:** manual Android emulator + Maestro compatibility smoke.
4. **Next:** provision isolated E2E API and MongoDB environment.
5. **Next:** configure Clerk development instance and Expo Clerk client.
6. **Next:** replace password smoke with Clerk test email + `424242` flow.
7. **Next:** implement MongoDB-backed API integration tests.
8. **Then:** add multi-user activity/invitation E2E journeys and make the reliable subset a required release gate.
