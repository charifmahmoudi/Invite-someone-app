# Testing strategy and CI/E2E architecture

## Purpose

Invite uses multiple test layers because no single layer can prove product behavior, server authorization, database concurrency and native usability at once.

```text
                 few, high-value
             ┌────────────────────┐
             │ Device E2E         │
             │ Maestro + physical │
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

See [ARCHITECTURE.md](./ARCHITECTURE.md) for trust boundaries, [FIREBASE_AUTH_SETUP.md](./FIREBASE_AUTH_SETUP.md) for identity configuration, and [FIREBASE_OPERATIONS_RUNBOOK.md](./FIREBASE_OPERATIONS_RUNBOOK.md) for the repeatable physical-phone/user-management/release procedure.

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

Two Firebase staging workflows add provider/native checks:

- **Firebase Hosted Auth Smoke** creates a disposable hosted Firebase password user, obtains a real Firebase ID token, proves the isolated Express API accepts that Firebase token, asserts that an unverified email cannot provision MongoDB state, and deletes the disposable Firebase user.
- **Validate Firebase Android** verifies isolated API health/401 behavior, runs Expo Android prebuild, validates generated Firebase configuration, compiles the native release APK, verifies the embedded JS bundle and expected signing certificate, and uploads a short-lived APK artifact for physical-device testing.

The mobile preview workflow independently builds the compatibility Android release variant from `main`, verifies the embedded JavaScript bundle, uploads the APK/checksum, and publishes the development-signed preview.

## Existing automated tests

- `validation.test.ts` protects registration/profile/activity validation.
- `matching.test.ts` verifies matching signals, eligibility rules and explanations.
- `profile-discovery.test.ts` verifies discovery filters, approximate distance calculations and bounded map projection.
- `app-reducer.test.ts` covers activity creation, invitations, acceptance, decline, public joining, duplicate prevention and saved activities.

These fast tests do not by themselves prove Firebase token verification, API authorization or MongoDB concurrency behavior.

## API integration layer

The hosted Firebase token boundary now has a real-provider staging smoke, but the full MongoDB-backed integration suite still needs to cover:

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

Do not weaken the hosted provider smoke by adding an authentication bypass. It deliberately proves a real token issued by the configured Firebase project.

## Device E2E architecture

```text
GitHub Actions
      |
      v
Firebase E2E release APK
      |
      +------> Firebase Authentication development project
      |
      v
Invite isolated Firebase E2E API
      |
      v
MongoDB invite_firebase_e2e
```

Production API/database must never be the default E2E target.

### Compatibility emulator foundation

The repository also contains:

```text
.maestro/auth/sign-in-internal.yaml
.github/workflows/e2e-android.yml
```

That manual workflow uses the seeded internal compatibility account and refuses the known production/demo API. It remains a build/device compatibility smoke while Firebase migration testing uses the isolated Firebase environment.

### Physical Firebase acceptance

The native Firebase release workflow produces `invite-firebase-android-e2e`. Follow [FIREBASE_OPERATIONS_RUNBOOK.md](./FIREBASE_OPERATIONS_RUNBOOK.md) to install that APK on a real Android phone and test:

- registration;
- verification-link handoff;
- profile provisioning;
- returning sign-in;
- password reset;
- persisted session after force-close/restart;
- sign-out;
- Google provider callback;
- MongoDB member/identity mapping.

A successful native compile is not equivalent to a successful Google OAuth callback; the package name and signing SHA-1 must also be registered in the Google OAuth Android client.

## Firebase Auth E2E strategy

Do not add an Invite authentication bypass or hard-coded production login.

Firebase's Auth Emulator remains useful for deterministic automation of Firebase-specific registration/email-verification behavior when practical. Hosted Firebase must still receive targeted release smokes because hosted configuration and Google OAuth are external dependencies that an emulator cannot prove.

The current hosted boundary smoke intentionally uses a disposable unverified Firebase account. Verified-email link handling still requires either a controlled mailbox/emulator test harness or the documented physical-phone acceptance test. Do not weaken the API's `emailVerified=true` provisioning requirement merely to simplify CI.

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
| E2E API URL | no | workflow/repository configuration |
| Firebase Web `apiKey` | no, public client configuration | Expo/E2E build |
| Firebase authDomain/projectId/appId/etc. | no | Expo/E2E build |
| Google OAuth client IDs | no | native/provider configuration |
| Google OAuth client secret | yes; not needed by current app | never in Expo |
| Firebase service-account private key | yes; not needed by current verifier | do not create/embed for this path |
| E2E MongoDB URI | yes | E2E server only |
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

Where unit tests need deterministic keys, inject or factor certificate retrieval rather than calling Google from every test. The hosted staging smoke now validates at least one real Firebase-issued token end-to-end.

## MongoDB schema/index gate

The isolated `invite_firebase_e2e` database is bootstrapped with the server's canonical `ensureDatabaseIndexes()` implementation. The one-time startup switch is `MONGODB_ENSURE_INDEXES_ON_START=true`; it must be returned to `false` after the schema indexes are established.

Normal scale-to-zero API startup must not maintain schema indexes on every cold start. See the runbook for the expected index list and verification procedure.

## Cold-start behavior

Free/scale-to-zero hosting can introduce a slow first request. Read paths may use bounded timeout/retry behavior, and E2E waits may allow a cold-start window.

Do not blindly retry writes such as activity creation or invitation acceptance until those operations have explicit idempotency guarantees.

## Failure evidence

Device jobs should retain:

- build/APK artifact;
- Maestro output/screenshots when Maestro is used;
- commit/build identifier;
- target environment identifier;
- API correlation IDs once request logging is implemented.

Never print Firebase ID tokens, MongoDB URIs, passwords, OAuth secrets or private keys to logs.

## Manual release matrix

| Platform | Target | Focus |
| --- | --- | --- |
| iOS | small supported iPhone | keyboard, wrapping, verification links, Firebase session |
| iOS | large current iPhone | safe areas, haptics, session restoration; Google after iOS provider enablement |
| Android | compact supported device | predictive back, keyboard, Firebase/Google callback |
| Android | large device | responsive layout, date/time picker |
| Web | Chrome and Safari | static routing, keyboard/focus, Firebase/Google browser auth when enabled |

Repeat important flows with larger system text, reduced motion, VoiceOver/TalkBack and poor network conditions.

## Implementation sequence

1. **Implemented:** fast CI static/domain/build gates.
2. **Implemented:** stable selectors and internal-auth Android compatibility smoke.
3. **Implemented:** Firebase client session bridge, email/password UI, verification and password reset flows.
4. **Implemented:** Firebase ID-token verification on the Express API.
5. **Implemented:** native Android Google credential integration.
6. **Implemented:** isolated Render Firebase API + dedicated MongoDB E2E database.
7. **Implemented:** canonical MongoDB index bootstrap/verification, returned to disabled-on-start normal mode.
8. **Implemented:** hosted real-Firebase-token boundary smoke including unverified-email provisioning rejection.
9. **Implemented:** native Firebase Android release build gate with hosted API smoke and downloadable physical-device artifact.
10. **Next release gate:** complete the runbook's physical-phone email/password, verification, reset, session and Google acceptance tests.
11. **Next automation:** expand MongoDB-backed authorization/concurrency integration coverage and deterministic verification-email testing.
12. **Then:** add multi-user activity/invitation E2E journeys and make the reliable subset a production release gate.
