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
- Smooth native navigation, press animations, haptics, responsive layouts, and accessible labels
- Local demo mode plus a server-side MongoDB API with secure mobile sessions

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

Start the development server:

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

Every change to `main` runs [the mobile preview workflow](./.github/workflows/mobile-preview.yml). It creates a standalone Android release-variant APK, verifies that the JavaScript bundle is embedded, records its SHA-256 checksum, and publishes both files to the `v1.0.0-preview.4` GitHub prerelease. The preview APK uses Android's development signing key and is intended for direct device testing, not Play Store submission. Preview 4 defaults to the live Render API; the public repository Actions variable `INVITE_API_URL` can override that URL for later environments.

The EAS `preview` profile also produces an APK when an authenticated Expo account is used:

```bash
npx eas-cli init
npx eas-cli build --platform android --profile preview
```

An installable iPhone IPA must be signed with an Apple Developer certificate and provisioning profile. The repository owner can link the project and let EAS manage those private credentials without committing them:

```bash
npx eas-cli init
npx eas-cli build --platform ios --profile preview
```

The iOS command prompts the authorized Apple Developer account when credentials have not been configured. An unsigned iOS archive is deliberately not published because it cannot be installed on a physical iPhone.

## Try the complete demo

No backend is required for product review. On the welcome screen, choose **Explore the demo**. Demo changes are persisted on the device with AsyncStorage.

You can also use the local sign-in screen:

- Email: `demo@invite.app`
- Password: any non-empty value

Local account creation intentionally stores no password. It exists only to exercise onboarding in preview mode.

## Connect MongoDB

Invite uses the MongoDB API whenever `EXPO_PUBLIC_API_URL` is set. The phone never connects directly to MongoDB: APK and IPA files can be inspected, so embedding a database username/password would expose the entire instance.

1. Create a MongoDB Atlas deployment or a local replica set.
2. Copy `server/.env.example` to `.env.server` and set `MONGODB_URI`, `MONGODB_DB_NAME`, and a strong `JWT_SECRET`. Development defaults point to `mongodb://127.0.0.1:27017` and production refuses the development JWT secret.
3. Run `npm run server:seed` once for fictional demo members, then `npm run server:dev`.
4. Deploy the API behind HTTPS and set `EXPO_PUBLIC_API_URL=https://your-api.example` in the mobile build environment.
5. Restart/rebuild Expo because `EXPO_PUBLIC_*` values are embedded into the application bundle.

The API hashes passwords, rate-limits authentication, keeps bearer sessions in Android Keystore/iOS Keychain storage, removes member emails from public profile responses, protects every mutation with server authorization, uses a `2dsphere` index for coarse discovery, and performs invitation acceptance plus attendance in a MongoDB transaction. See [MongoDB backend setup](./docs/MONGODB_BACKEND.md).

The previous Supabase adapter and migration remain available as a compatibility path when no MongoDB API URL is configured.

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
| `npm run server:seed`  | Seed an empty database with fictional demo data   |
| `npm run format`       | Format source and documentation                   |

## Documentation

- [Product brief](./docs/PRODUCT.md)
- [User stories and acceptance criteria](./docs/USER_STORIES.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Data model and security rules](./docs/DATA_MODEL.md)
- [Testing strategy](./docs/TESTING.md)
- [Safety and privacy](./docs/SAFETY_AND_PRIVACY.md)
- [Contributing](./CONTRIBUTING.md)

## Project status

This repository contains a functional, testable MVP. Push notifications, chat, moderation operations, image uploads, localization, analytics, and app-store release credentials are intentionally listed as post-MVP work rather than represented as finished features.

## License

MIT © 2026 Charif Mahmoudi. See [LICENSE](./LICENSE).
