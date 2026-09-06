# Testing strategy and CI/E2E architecture

## Purpose

Invite uses multiple test layers because no single layer can prove product behavior, server authorization, database concurrency and native usability at once.

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

See [ARCHITECTURE.md](./ARCHITECTURE.md) for application trust boundaries and [SUPABASE_AUTH_SETUP.md](./SUPABASE_AUTH_SETUP.md) for identity configuration.

## Current CI gates

The `CI` workflow runs:

1. `npm ci`;
2. strict application and server TypeScript compilation;
3. ESLint;
4. Jest domain/user-story tests with configured coverage;
5. a production Expo web export.

It runs on `main`, pull requests, `impl/**` staging branches and manual dispatch.

Run the fast gates locally with:

```bash
npm run typecheck
npm run lint
npm run test:ci
npm run export:web -- --output-dir dist
```

The mobile preview workflow independently builds the Android release variant, verifies the embedded JavaScript bundle, uploads the APK/checksum, and publishes the development-signed preview from `main`.

## Existing automated tests

- `validation.test.ts` protects registration/profile/activity validation.
- `matching.test.ts` verifies matching signals, eligibility rules and explanations.
- `profile-discovery.test.ts` verifies discovery filters, approximate distance calculations and bounded map projection.
- `app-reducer.test.ts` covers activity creation, invitations, acceptance, decline, public joining, duplicate prevention and saved activities.

These fast tests do not prove API authorization or MongoDB concurrency behavior.

## API integration layer

Before public production release, CI should run the server against an isolated MongoDB environment that supports transactions. Required scenarios include:

- unauthenticated protected requests fail;
- invalid/expired Supabase access tokens fail;
- a valid Supabase identity resolves only to its mapped Invite user;
- an unmapped Supabase identity receives `INVITE_PROFILE_REQUIRED` on member resources;
- external identity provisioning requires a verified email;
- an external identity cannot silently claim an existing Invite account by matching email;
- a member cannot update another profile;
- invite-only activities are hidden from unrelated members;
- only a host can send invitations;
- receiver/sender permissions are enforced for invitation responses;
- simultaneous final-slot joins produce one success and one capacity failure;
- invitation acceptance and attendee insertion roll back together;
- saved activities are private;
- public profiles do not leak email/auth fields;
- geospatial queries respect their maximum distance.

This integration suite is still to be implemented.

## Device E2E architecture

Target environment:

```text
GitHub Actions
      |
      v
Android emulator
      |
      v
Invite E2E APK
      |
      +------> Supabase Auth test/development project
      |
      v
Invite E2E API
      |
      v
MongoDB E2E database
```

Production API/database must never be the default E2E target.

### Implemented emulator foundation

The repository contains:

```text
.maestro/auth/sign-in-internal.yaml
.github/workflows/e2e-android.yml
```

The manual Android workflow requires an explicit E2E API, refuses the known production/demo API, builds and installs a release APK, runs Maestro, and uploads available evidence.

The current workflow still uses the seeded internal compatibility account:

```text
demo@invite.app
invite-demo
```

This is transitional and remains manual-only.

## Supabase Auth E2E strategy

Do not add an Invite authentication bypass or magic OTP.

Hosted Supabase Auth email OTP should be exercised through the real Supabase boundary. Unlike the previous Clerk plan, there is no Invite-owned deterministic `424242` code. Reliable CI therefore needs one of these isolated strategies:

- a test mailbox/inbox API that CI can read after requesting the OTP;
- a dedicated self-hosted/local Supabase Auth test environment with controlled mail delivery;
- another provider-supported test harness that still issues normal Supabase sessions.

Until one of those is implemented, retain the internal-auth smoke as a compatibility build test and perform hosted Supabase OTP as a targeted manual release smoke.

Google provider UI should not be the routine CI authentication path because consent screens, bot challenges, MFA/device checks and provider changes make it brittle. Test Google as a release/provider configuration smoke after email OTP and API authorization are proven.

## E2E personas and data

Use ordinary isolated members such as:

```text
HOST
  e2e-host@example.test
  Berlin
  coffee, hiking

GUEST
  e2e-guest@example.test
  Berlin
  coffee, photography

THIRD
  e2e-third@example.test
  Potsdam
  cycling
```

Routine runs may preserve stable external auth identities, but application-domain fixtures must be reset only in the isolated MongoDB environment.

Never run a destructive reset against production.

## Stable UI selectors

Critical selectors include:

```text
welcome-screen
welcome-sign-in
auth-sign-in-screen
auth-email
auth-password          # compatibility path only
auth-submit
auth-code
auth-verify-code
auth-google
auth-error
auth-profile-onboarding
profile-name
profile-city
profile-submit
```

Use human-visible copy for assertions only when the copy itself is behavior under test.

## High-value E2E journeys

After isolated Supabase-authenticated E2E is available, prioritize:

1. email-code sign-in and session restoration;
2. first-time identity profile provisioning;
3. returning identity resolves to the same Invite user;
4. host creates a community activity;
5. host discovers a guest and sends an invitation;
6. guest signs in and accepts the invitation;
7. final-slot capacity cannot be overbooked;
8. invite-only activity stays invisible to an unrelated third user;
9. save/unsave persists;
10. profile edits persist;
11. unauthorized actions are unavailable in UI and rejected by API.

A representative multi-user journey is:

```text
reset isolated fixture
  -> sign in HOST through Supabase Auth
  -> create activity
  -> invite GUEST
  -> sign out
  -> sign in GUEST through Supabase Auth
  -> accept invitation
  -> assert attendee state
```

## Secrets and public configuration

| Value | Secret? | Location |
| --- | --- | --- |
| E2E API URL | no | workflow input/repository variable |
| `EXPO_PUBLIC_SUPABASE_URL` | no | Expo/E2E build |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | no, public by design | Expo/E2E build |
| `SUPABASE_URL` | no | Invite API environment |
| `SUPABASE_PUBLISHABLE_KEY` | no, public by design | Invite API environment |
| E2E MongoDB URI | yes | E2E server/trusted CI only |
| production MongoDB URI | yes | production server only |

The current API design does not require a Supabase service-role secret. Never expose MongoDB credentials or any future Supabase secret/service-role key through an `EXPO_PUBLIC_*` variable.

Privileged workflows must not execute untrusted fork code with repository secrets.

## Cold-start behavior

Free/scale-to-zero hosting can introduce a slow first request. Read paths may use bounded timeout/retry behavior, and E2E waits may allow a cold-start window.

Do not blindly retry writes such as activity creation or invitation acceptance until those operations have explicit idempotency guarantees.

## Failure evidence

Device jobs should retain:

- Maestro output/artifacts;
- screenshots generated by Maestro;
- commit/build identifier;
- target environment identifier;
- API correlation IDs once request logging is implemented.

Do not print bearer tokens, MongoDB URIs or credentials to logs.

## Manual release matrix

| Platform | Target | Focus |
| --- | --- | --- |
| iOS | small supported iPhone | keyboard, wrapping, date picker, managed auth |
| iOS | large current iPhone | safe areas, haptics, session restoration |
| Android | compact supported device | predictive back, keyboard, Supabase auth callback |
| Android | large device | responsive layout, date/time picker |
| Web | Chrome and Safari | static routing, keyboard/focus, browser auth |

Repeat important flows with larger system text, reduced motion, VoiceOver/TalkBack and poor network conditions.

## Implementation sequence

1. **Implemented:** fast CI static/domain/build gates.
2. **Implemented:** stable selectors for compatibility and managed sign-in UI.
3. **Implemented:** manual Android emulator + Maestro internal-auth compatibility smoke.
4. **Implemented:** Supabase Auth client/API identity integration foundation.
5. **Next:** validate isolated Supabase-enabled Render + MongoDB environment.
6. **Next:** configure hosted Supabase email OTP template and run manual identity/provisioning smoke.
7. **Next:** implement MongoDB-backed API integration tests.
8. **Next:** choose an isolated OTP mailbox/test harness and replace the compatibility device smoke with a real Supabase Auth flow.
9. **Then:** add multi-user activity/invitation E2E journeys and make the reliable subset a release gate.
