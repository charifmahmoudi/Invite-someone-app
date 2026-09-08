# Invite

Invite is a cross-platform social app designed to make the first move easier. Members create a profile, discover people through shared interests, make a small plan, and send a thoughtful invitation. Repeated low-pressure interactions can grow into genuine local communities.

The same TypeScript codebase runs on Android, iPhone, and web using Expo SDK 57 and React Native.

## Current project state

Invite is in **MVP hardening**.

- Firebase migration source is already on `main`.
- Production infrastructure has **not** been cut over; Render auto-deploy is disabled.
- Active hardening work is isolated on `impl/mvp-hardening`.
- Google Play Internal testing versionCode **5** installs and launches on the physical test phone.
- The earlier full Play-installed functional suite was explicitly waived, so it remains **not executed / not passed**.
- The hardening branch adds explicit managed-auth states, stronger login recovery, a new Android/Firebase quality gate, clearer trust semantics, an in-app Help & Safety center, and rewritten MVP/user/support documentation.

See [Current status](./docs/CURRENT_STATUS.md) and [MVP definition](./docs/MVP.md) before making release or production decisions.

## Product highlights

- Firebase email/password account creation, verification, password reset, and managed sessions
- Native Android Google Sign-In exchanged into Firebase
- Guided profile onboarding with interests, availability, and connection goals
- Personalized plan feed with category filters and saved plans
- People discovery with biography, interest, availability, goal, verification, and approximate-distance filters
- Privacy-first approximate-area map with no exact home pins or live-location permission
- Host flow for creating a plan, setting capacity/visibility, and inviting recommended people
- Received/sent invitation inboxes with accept, decline, and cancel states
- Community plans with server-side transactional capacity protection
- Profile editing, hosted plans, and evidence-aware trust presentation
- First-meeting safety guidance plus an in-app Help & Safety center on the hardening branch
- Express/MongoDB API for authorization and Invite domain data
- Local demo mode for product review without a backend account

Public MVP still requires host plan edit/cancel, attendee leave, block/report controls, account deletion, stronger server integration coverage, and final design/workflow polish. These are tracked in [MVP.md](./docs/MVP.md) and [USER_STORIES.md](./docs/USER_STORIES.md).

## Quick start

Requirements:

- Node.js 22.13 or newer
- npm 10 or newer
- Android Studio for a local Android build, or Xcode 26.4+ on macOS for iOS

Install and verify:

```bash
npm ci
npm run typecheck
npm test
npm run lint
```

Start Expo:

```bash
npm start
```

You can also run the web target with `npm run web`. SDK 57 should be tested with an Expo development build rather than the store version of Expo Go:

```bash
npx expo run:android
npx expo run:ios
```

The iOS command requires macOS. EAS profiles for cloud development, preview, and production builds are included in [eas.json](./eas.json).

## Installable builds and Google Play

The current Google Play test release is:

```text
Package: com.charifmahmoudi.invite
Track: internal
Release: Invite Internal 15
Android versionCode: 5
```

Google Play tester enrollment, release visibility, physical-device installation, and launch are working.

The original Firebase Android release workflow remains [Validate Firebase Android](./.github/workflows/validate-firebase-android.yml). The active hardening branch also adds [MVP Quality Gate](./.github/workflows/mvp-quality.yml), which is designed to protect `main` and `impl/mvp-hardening` with:

- a genuine disposable Firebase identity boundary check against the isolated staging API;
- proof that an unmapped identity gets `INVITE_PROFILE_REQUIRED`;
- proof that an unverified identity gets `VERIFIED_EMAIL_REQUIRED` when provisioning;
- a Firebase-enabled Android release APK build;
- API 35 emulator managed-auth invalid-login smoke;
- clean-state core/demo navigation smoke;
- retained Maestro evidence.

The MVP quality workflow does **not** publish an AAB and does not deploy production.

The earlier Play screenshot workflow successfully published two phone screenshots, but later review of its retained evidence found a visible Android system `Quickstep isn't responding` dialog over both images. The hardening branch changes the capture script to reject captures while an ANR/error dialog remains visible. Clean listing screenshots must be regenerated before public release.

## Try the complete demo

No backend is required for product review. On the welcome screen, choose **Explore the demo**. Demo changes are persisted locally.

The local compatibility sign-in path also supports the fictional review account in preview mode:

- Email: `demo@invite.app`
- Password: any non-empty value in local preview mode

Demo/local preview behavior must never be presented as production authentication.

## Architecture

Invite deliberately separates identity from product data:

```text
Expo / React Native
   |-- Firebase Authentication
   |     email/password, verification, reset, Google identity/session
   |
   `-- Invite Express API
          authorization + business rules
              |
              `-- MongoDB Atlas
                    Invite profiles, plans, invitations, identity mappings
```

Firebase is an identity provider only. MongoDB remains authoritative for Invite domain data.

The API maps each Firebase UID to a stable internal Invite user ID, so provider identifiers do not become domain identifiers.

Key identity invariants:

- a verified primary email is required before Firebase profile provisioning;
- email equality alone never links identities;
- an existing-email collision returns `ACCOUNT_LINK_REQUIRED`;
- a temporary backend failure must not be interpreted as a missing profile;
- API authorization remains authoritative even when the UI hides/disables an action.

## Deployment separation

```text
Source
  main
    Firebase migration source promoted

  impl/mvp-hardening
    active MVP hardening work

Firebase staging
  Render: invite-someone-api-firebase-e2e
  MongoDB: invite_firebase_e2e
  Google Play: Internal testing

Production
  Render: invite-someone-api
  MongoDB: invite_someone
  operational Firebase cutover: not performed yet
```

Render auto-deploy is disabled for staging and production. Git branch HEAD and the live Render deployment revision must always be checked independently.

See [Deployment architecture](./docs/DEPLOYMENT_ARCHITECTURE.md).

## Managed-auth client variables

A Firebase-enabled build uses public Firebase client configuration:

```bash
EXPO_PUBLIC_API_URL=https://your-invite-api.example
EXPO_PUBLIC_FIREBASE_API_KEY=your_web_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:example
```

Android Google Sign-In is configured natively with `google-services.json`, a Web OAuth client for ID-token issuance, and an Android OAuth client registered for `com.charifmahmoudi.invite` plus the SHA-1 certificate used to sign the installed build.

The direct test APK, Play upload key, and Play App Signing certificate are separate signing identities. A Google Play-installed build uses the **Play App Signing** certificate for Google OAuth matching.

Never put MongoDB credentials, OAuth client secrets, Firebase service-account JSON, signing private keys, keystore passwords, or private keys in `EXPO_PUBLIC_*` variables.

## Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start Expo development server |
| `npm run android` | Open the Android target |
| `npm run ios` | Open the iOS target |
| `npm run web` | Open the web target |
| `npm run typecheck` | Run strict client/server TypeScript checks |
| `npm run lint` | Run Expo ESLint and React rules |
| `npm test` | Run the Jest user-story/domain suite |
| `npm run test:ci` | Run tests with coverage in CI mode |
| `npm run export:web` | Produce a static web export |
| `npm run server:dev` | Start the MongoDB API with file watching |
| `npm run server:start` | Start the MongoDB API |
| `npm run server:indexes` | Create/verify MongoDB indexes |
| `npm run server:seed` | Seed an empty database with fictional demo data |
| `npm run format` | Format source and documentation |

## Documentation

### Product and MVP

- [MVP definition](./docs/MVP.md)
- [Product brief](./docs/PRODUCT.md)
- [User stories and acceptance criteria](./docs/USER_STORIES.md)
- [Current status](./docs/CURRENT_STATUS.md)

### User help

- [User guide](./docs/USER_GUIDE.md)
- [Account and login help](./docs/ACCOUNT_AND_LOGIN_HELP.md)
- [Help and FAQ](./docs/HELP_AND_FAQ.md)
- [Safety guide](./docs/SAFETY_GUIDE.md)

### Operations / engineering

- [Support runbook](./docs/SUPPORT_RUNBOOK.md)
- [Application architecture](./docs/ARCHITECTURE.md)
- [Deployment architecture](./docs/DEPLOYMENT_ARCHITECTURE.md)
- [Firebase Auth setup](./docs/FIREBASE_AUTH_SETUP.md)
- [Firebase operations runbook](./docs/FIREBASE_OPERATIONS_RUNBOOK.md)
- [Google Play testing/signing/listing guide](./docs/GOOGLE_PLAY_TESTING.md)
- [MongoDB backend setup](./docs/MONGODB_BACKEND.md)
- [Data model and authorization](./docs/DATA_MODEL.md)
- [Testing strategy](./docs/TESTING.md)
- [Safety and privacy engineering design](./docs/SAFETY_AND_PRIVACY.md)
- [Contributing](./CONTRIBUTING.md)

## Production policy

Source promotion is not production deployment. The production Render API and database must not be changed merely because a branch is merged.

Before production cutover, recheck the exact candidate SHA, live Render revision, client/server compatibility, database state, rollback plan, and the release evidence required for the candidate.

Any acceptance suite that was not executed must remain documented as **not executed / waived**, never as passed.

## License

MIT © 2026 Charif Mahmoudi. See [LICENSE](./LICENSE).
