# Invite

Invite is a cross-platform social activity app designed to make the first move easier. Members create a profile, discover people through shared interests, make a small plan, and send a thoughtful invitation. Repeated low-pressure interactions can grow into genuine local communities.

The same TypeScript codebase runs on iPhone, Android, and the web using Expo SDK 57 and React Native.

## Product highlights

- Guided account creation with interests, availability, and connection goals
- Personalized activity feed with category filters and saved plans
- Photo-backed people discovery with biography, interest, availability, goal, trust, and distance filters
- Privacy-first approximate-area map with no exact home pins or location permission
- Complete host flow: create an activity, set capacity and visibility, and invite recommended people
- Received and sent invitation inboxes with accept, decline, and cancel states
- Community activities that members can join, with transactional capacity protection in production
- Profile editing, attendance history, reliability signals, and hosted plans
- First-meeting safety guidance embedded in invitation and activity flows
- Local demo/internal-auth compatibility plus Firebase Authentication managed identity
- Server-side Express/MongoDB API for authorization and product data

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

## Installable builds

Every change to `main` runs [the mobile preview workflow](./.github/workflows/mobile-preview.yml). It creates a standalone Android release-variant APK, verifies that the JavaScript bundle is embedded, records its SHA-256 checksum, and publishes both files to the `v1.0.0-preview.4` GitHub prerelease. The preview APK uses Android's development signing key and is intended for direct device testing, not Play Store submission.

The default preview remains on the compatibility API until a Firebase-enabled client and API are deliberately cut over together.

Firebase migration testing uses the on-demand [Validate Firebase Android workflow](./.github/workflows/validate-firebase-android.yml). It targets the isolated Firebase E2E API, checks the hosted API boundary, builds the native Firebase/Google-enabled APK, verifies its signing certificate, and uploads the `invite-firebase-android-e2e` artifact for physical-device testing. See the [Firebase operations and mobile testing runbook](./docs/FIREBASE_OPERATIONS_RUNBOOK.md) for installation and acceptance steps.

The EAS `preview` profile also produces an APK when an authenticated Expo account is used:

```bash
npx eas-cli init
npx eas-cli build --platform android --profile preview
```

An installable iPhone IPA must be signed with an Apple Developer certificate and provisioning profile.

## Try the complete demo

No backend is required for product review. On the welcome screen, choose **Explore the demo**. Demo changes are persisted on the device with AsyncStorage.

You can also use the local compatibility sign-in screen:

- Email: `demo@invite.app`
- Password: any non-empty value in local preview mode

## Production architecture

Invite deliberately separates identity from product data:

```text
Expo / React Native
   |-- Firebase Authentication: email/password + Google identity/session
   |
   `-- Invite Express API: authorization + business rules
              |
              `-- MongoDB Atlas: Invite profiles/domain data
```

Firebase is an identity provider only. MongoDB remains authoritative for profiles, activities, invitations, saved plans and identity mappings.

The Express API maps each Firebase UID to an internal Invite user ID, so authentication-provider IDs do not leak throughout the domain model.

See [Architecture](./docs/ARCHITECTURE.md), [Firebase Auth setup](./docs/FIREBASE_AUTH_SETUP.md), and the [Firebase operations runbook](./docs/FIREBASE_OPERATIONS_RUNBOOK.md).

## Connect MongoDB and the API

Invite uses the Express/MongoDB API whenever `EXPO_PUBLIC_API_URL` is set. The phone never connects directly to MongoDB: APK and IPA files can be inspected, so embedding a database username/password would expose the database.

For compatibility/internal auth, see [MongoDB backend setup](./docs/MONGODB_BACKEND.md). For the target managed-auth configuration, set the API to `AUTH_MODE=firebase` and follow [FIREBASE_AUTH_SETUP.md](./docs/FIREBASE_AUTH_SETUP.md).

The API protects every mutation with server authorization, removes private auth/email fields from public profile responses, uses coarse geospatial discovery, and performs invitation acceptance plus attendance in a MongoDB transaction.

## Managed-auth client variables

A Firebase-enabled build uses public Firebase Web configuration:

```bash
EXPO_PUBLIC_API_URL=https://your-invite-api.example
EXPO_PUBLIC_FIREBASE_API_KEY=your_web_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:example
```

Android Google sign-in is configured natively with `google-services.json`, a Web OAuth client for ID-token issuance, and a Google OAuth **Android** client registered for `com.charifmahmoudi.invite` plus the certificate SHA-1 used to sign that build. Android does not require an OAuth client secret or `EXPO_PUBLIC_GOOGLE_*` variables.

Every Android signing channel can have a different SHA-1. The staging/development APK fingerprint must not be assumed to equal the future Google Play App Signing fingerprint.

Never put MongoDB credentials, OAuth client secrets, Firebase service-account JSON, or private keys in `EXPO_PUBLIC_*` variables.

## Commands

| Command                  | Purpose                                           |
| ------------------------ | ------------------------------------------------- |
| `npm start`              | Start Expo development server                     |
| `npm run android`        | Open the Android target                           |
| `npm run ios`            | Open the iOS target                               |
| `npm run web`            | Open the web target                               |
| `npm run typecheck`      | Run strict TypeScript checks                      |
| `npm run lint`           | Run Expo's ESLint rules and React Compiler checks |
| `npm test`               | Run the Jest user-story suite                     |
| `npm run test:ci`        | Run tests with coverage in CI mode                |
| `npm run export:web`     | Produce a static web export                       |
| `npm run server:dev`     | Start the MongoDB API with file watching          |
| `npm run server:start`   | Start the MongoDB API                             |
| `npm run server:indexes` | Create/verify MongoDB indexes                     |
| `npm run server:seed`    | Seed an empty database with fictional demo data   |
| `npm run format`         | Format source and documentation                   |

## Documentation

- [Product brief](./docs/PRODUCT.md)
- [User stories and acceptance criteria](./docs/USER_STORIES.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Firebase Auth setup](./docs/FIREBASE_AUTH_SETUP.md)
- [Firebase operations and mobile testing runbook](./docs/FIREBASE_OPERATIONS_RUNBOOK.md)
- [MongoDB backend setup](./docs/MONGODB_BACKEND.md)
- [Data model and security rules](./docs/DATA_MODEL.md)
- [Testing strategy](./docs/TESTING.md)
- [Safety and privacy](./docs/SAFETY_AND_PRIVACY.md)
- [Contributing](./CONTRIBUTING.md)

## Project status

This repository contains a functional, testable MVP. Firebase Authentication is being staged without breaking already-installed internal-auth builds. The old direct-Supabase data adapter remains only as historical compatibility code and is not the target authentication architecture. Push notifications, chat, moderation operations, first-party image uploads, localization, analytics, Apple sign-in, explicit legacy-account linking, and app-store release credentials remain post-MVP or later migration work.

## License

MIT © 2026 Charif Mahmoudi. See [LICENSE](./LICENSE).
