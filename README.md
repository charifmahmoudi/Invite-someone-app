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
- Local demo/internal-auth compatibility plus Supabase Auth managed identity
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

The current published preview remains on the compatibility API until a Supabase-enabled build and API are deliberately cut over together. See [Supabase Auth setup](./docs/SUPABASE_AUTH_SETUP.md).

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
   |-- Supabase Auth: email OTP + Google identity/session
   |
   `-- Invite Express API: authorization + business rules
              |
              `-- MongoDB Atlas: Invite profiles/domain data
```

Supabase Postgres is **not** the Invite application database. MongoDB remains authoritative for profiles, activities, invitations, saved plans and identity mappings.

The Express API maps each Supabase Auth user UUID to an internal Invite user ID, so authentication-provider IDs do not leak throughout the domain model.

See [Architecture](./docs/ARCHITECTURE.md) and [Supabase Auth setup](./docs/SUPABASE_AUTH_SETUP.md).

## Connect MongoDB and the API

Invite uses the Express/MongoDB API whenever `EXPO_PUBLIC_API_URL` is set. The phone never connects directly to MongoDB: APK and IPA files can be inspected, so embedding a database username/password would expose the database.

For compatibility/internal auth, see [MongoDB backend setup](./docs/MONGODB_BACKEND.md). For the target managed-auth configuration, set the API to `AUTH_MODE=supabase` and follow [SUPABASE_AUTH_SETUP.md](./docs/SUPABASE_AUTH_SETUP.md).

The API protects every mutation with server authorization, removes private auth/email fields from public profile responses, uses coarse geospatial discovery, and performs invitation acceptance plus attendance in a MongoDB transaction.

## Managed-auth client variables

A Supabase-enabled build uses public configuration only:

```bash
EXPO_PUBLIC_API_URL=https://your-invite-api.example
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Never put MongoDB credentials or Supabase secret/service-role keys in `EXPO_PUBLIC_*` variables.

## Commands

| Command                | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `npm start`            | Start Expo development server                     |
| `npm run android`      | Open the Android target                           |
| `npm run ios`          | Open the iOS target                               |
| `npm run web`          | Open the web target                               |
| `npm run typecheck`    | Run strict TypeScript checks                      |
| `npm run lint`         | Run Expo's ESLint rules and React Compiler checks |
| `npm test`             | Run the Jest user-story suite                     |
| `npm run test:ci`      | Run tests with coverage in CI mode                |
| `npm run export:web`   | Produce a static web export                       |
| `npm run server:dev`   | Start the MongoDB API with file watching          |
| `npm run server:start` | Start the MongoDB API                             |
| `npm run server:indexes` | Create/verify MongoDB indexes                   |
| `npm run server:seed`  | Seed an empty database with fictional demo data   |
| `npm run format`       | Format source and documentation                   |

## Documentation

- [Product brief](./docs/PRODUCT.md)
- [User stories and acceptance criteria](./docs/USER_STORIES.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Supabase Auth setup](./docs/SUPABASE_AUTH_SETUP.md)
- [MongoDB backend setup](./docs/MONGODB_BACKEND.md)
- [Data model and security rules](./docs/DATA_MODEL.md)
- [Testing strategy](./docs/TESTING.md)
- [Safety and privacy](./docs/SAFETY_AND_PRIVACY.md)
- [Contributing](./CONTRIBUTING.md)

## Project status

This repository contains a functional, testable MVP. Supabase Auth migration is being staged without breaking already-installed internal-auth builds. Push notifications, chat, moderation operations, first-party image uploads, localization, analytics, Apple sign-in, explicit legacy-account linking, and app-store release credentials remain post-MVP or later migration work.

## License

MIT © 2026 Charif Mahmoudi. See [LICENSE](./LICENSE).
