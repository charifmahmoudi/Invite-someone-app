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
             │ Firebase + Mongo   │
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

See [ARCHITECTURE.md](./ARCHITECTURE.md) for trust boundaries and [FIREBASE_AUTH_SETUP.md](./FIREBASE_AUTH_SETUP.md) for identity configuration.

## Current CI gates

The `CI` workflow runs:

1. `npm ci`;
2. strict application and server TypeScript compilation;
3. ESLint/React Compiler checks;
4. Jest domain/user-story tests with coverage;
5. production Expo web export.

It runs on `main`, pull requests, `impl/**` staging branches and manual dispatch.

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

These fast tests do not prove Firebase token verification, API authorization or MongoDB concurrency behavior.

## API integration layer

Before public production release, CI should run the server against an isolated MongoDB environment that supports transactions. Required Firebase scenarios include:

- unauthenticated protected requests fail;
- malformed, expired, wrong-audience and wrong-issuer Firebase ID tokens fail;
- an ID token signed by an unknown Firebase key ID fails;
- a valid Firebase UID resolves only to its mapped Invite user;
- an unmapped Firebase UID receives `INVITE_PROFILE_REQUIRED` on member resources;
- provisioning requires a verified email claim;
- a Firebase identity cannot silently claim an existing Invite account by matching email;
- a member cannot update another profile;
- invite-only activities are hidden from unrelated members;
- only a host can send invitations;
- receiver/sender permissions are enforced for invitation responses;
- simultaneous final-slot joins produce one success and one capacity failure;
- invitation acceptance and attendee insertion roll back together;
- saved activities are private;
- public profiles do not leak email/auth fields;
- geospatial queries respect their maximum distance.

The full integration suite is still to be implemented.

## Device E2E architecture

```text
GitHub Actions
      |
      v
Android emulator
      |
      v
Invite E2E APK
      |
      +------> Firebase Authentication test/development project
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

The current manual workflow still uses the seeded internal compatibility account:

```text
demo@invite.app
invite-demo
```

It requires an explicit isolated API and refuses the known production/demo API. This remains a build/device compatibility smoke until the Firebase test harness is added.

## Firebase Auth E2E strategy

Do not add an Invite authentication bypass or hard-coded production login.

Firebase's Auth Emulator is the preferred deterministic automation target for Firebase-specific registration/email-verification behavior when practical. Hosted Firebase should still receive targeted release smoke tests because hosted configuration, authorized domains and Google OAuth are external dependencies that an emulator cannot prove.

For hosted email/password E2E, use dedicated non-production Firebase users and an isolated Invite API/database. Email verification can be tested through an emulator or controlled test mailbox; do not weaken the API's `emailVerified=true` provisioning requirement merely to simplify CI.

Google provider UI should not be the routine CI authentication path because consent screens, bot/device challenges and provider-side changes make it brittle. Test Google as a release/provider configuration smoke after email/password and API authorization are proven.

## Stable UI selectors

Current managed-auth selectors include:

```text
welcome-screen
welcome-sign-in
auth-sign-in-screen
auth-registration
auth-email
auth-password
auth-submit
auth-google
auth-error
auth-email-verification
auth-check-verification
auth-profile-onboarding
profile-name
profile-city
profile-submit
```

The legacy compatibility path intentionally reuses `auth-email`, `auth-password` and `auth-submit` so the existing Maestro smoke can remain stable during migration.

## High-value managed-auth journeys

Prioritize:

1. email/password registration;
2. unverified user cannot provision an Invite profile;
3. email verification refresh unlocks onboarding;
4. first-time Firebase identity provisions one internal Invite user;
5. returning Firebase identity resolves to the same Invite user;
6. password reset request succeeds without leaking whether a user exists;
7. session restoration and ID-token refresh survive app restart/backgrounding;
8. sign-out clears both Firebase and Invite sessions;
9. Google sign-in creates/loads the correct Firebase identity;
10. final-slot capacity, invitation privacy and authorization remain correct across users.

Representative multi-user journey:

```text
reset isolated fixture
  -> sign in HOST through Firebase
  -> create activity
  -> invite GUEST
  -> sign out
  -> sign in GUEST through Firebase
  -> accept invitation
  -> assert attendee state
```

## Secrets and public configuration

| Value | Secret? | Location |
| --- | --- | --- |
| E2E API URL | no | workflow input/repository variable |
| Firebase Web `apiKey` | no, public client configuration | Expo/E2E build |
| Firebase authDomain/projectId/appId/etc. | no | Expo/E2E build |
| Google OAuth client IDs | no | Expo/E2E build |
| Google OAuth client secret | yes; not needed by current app | never in Expo |
| Firebase service-account private key | yes; not needed by current verifier | do not create/embed for this path |
| E2E MongoDB URI | yes | E2E server/trusted CI only |
| production MongoDB URI | yes | production server only |

Privileged workflows must not execute untrusted fork code with repository secrets.

## Firebase server verification tests

The server verifier should be exercised at the JWT boundary. Test the documented Firebase constraints:

```text
header.alg == RS256
header.kid exists in Google's Firebase signing certificates
aud == invite-someone-app
iss == https://securetoken.google.com/invite-someone-app
sub is non-empty
exp is future
iat is not future
auth_time is not future
```

Where unit tests need deterministic keys, inject or factor certificate retrieval rather than calling Google from every test. At least one staging smoke should validate a real Firebase-issued token end-to-end.

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

Never print Firebase ID tokens, MongoDB URIs, passwords, OAuth secrets or private keys to logs.

## Manual release matrix

| Platform | Target | Focus |
| --- | --- | --- |
| iOS | small supported iPhone | keyboard, wrapping, verification links, Firebase session |
| iOS | large current iPhone | safe areas, haptics, session restoration, Google |
| Android | compact supported device | predictive back, keyboard, Firebase/Google callback |
| Android | large device | responsive layout, date/time picker |
| Web | Chrome and Safari | static routing, keyboard/focus, Firebase/Google browser auth |

Repeat important flows with larger system text, reduced motion, VoiceOver/TalkBack and poor network conditions.

## Implementation sequence

1. **Implemented:** fast CI static/domain/build gates.
2. **Implemented:** stable selectors and internal-auth Android compatibility smoke.
3. **Implemented:** Firebase client session bridge and email/password UI.
4. **Implemented:** email verification and password-reset client flows.
5. **Implemented:** Firebase ID-token verification on the Express API.
6. **Implemented:** Google credential integration, feature-gated on public OAuth client IDs.
7. **Next:** validate Firebase-enabled isolated Render + MongoDB environment.
8. **Next:** add MongoDB-backed Firebase API integration tests.
9. **Next:** add Firebase Emulator/controlled-mail E2E registration verification.
10. **Then:** add multi-user activity/invitation E2E journeys and make the reliable subset a release gate.
