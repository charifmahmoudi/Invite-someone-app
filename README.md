# Invite

Invite is a cross-platform social activity app designed to make the first move easier. Members create a profile, discover people through shared interests, make a small plan, and send a thoughtful invitation. Repeated low-pressure interactions can grow into genuine local communities.

The same TypeScript codebase runs on iPhone, Android, and the web using Expo SDK 57 and React Native.

## Product highlights

- Guided account creation with interests, availability, and connection goals
- Personalized activity feed with category filters and saved plans
- People discovery based on transparent, non-sensitive matching signals
- Complete host flow: create an activity, set capacity and visibility, and invite recommended people
- Received and sent invitation inboxes with accept, decline, and cancel states
- Community activities that members can join, with transactional capacity protection in production
- Profile editing, attendance history, reliability signals, and hosted plans
- First-meeting safety guidance embedded in invitation and activity flows
- Smooth native navigation, press animations, haptics, responsive layouts, and accessible labels
- Local demo mode plus a production-ready Supabase authentication and database path

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

## Try the complete demo

No backend is required for product review. On the welcome screen, choose **Explore the demo**. Demo changes are persisted on the device with AsyncStorage.

You can also use the local sign-in screen:

- Email: `demo@invite.app`
- Password: any non-empty value

Local account creation intentionally stores no password. It exists only to exercise onboarding in preview mode.

## Connect the production backend

Invite switches automatically to Supabase when both public environment variables are present.

1. Create a Supabase project.
2. Apply [the initial migration](./supabase/migrations/20260815000000_initial_schema.sql) with `supabase db push` or the Supabase SQL editor.
3. Copy `.env.example` to `.env`.
4. Add the project URL and **publishable** key. Never put a service-role key in a mobile app.
5. Restart Expo so public environment values are embedded in the bundle.
6. In Supabase Auth URL settings, add the `invite://` scheme for email/OAuth redirects if those flows are enabled.

The migration includes Row Level Security for profiles, relevant activities, invitations, attendees, and saved plans. Invitation acceptance and capacity checks run transactionally in Postgres.

## Commands

| Command              | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `npm start`          | Start Expo development server                     |
| `npm run android`    | Open the Android target                           |
| `npm run ios`        | Open the iOS target                               |
| `npm run web`        | Open the web target                               |
| `npm run typecheck`  | Run strict TypeScript checks                      |
| `npm run lint`       | Run Expo's ESLint rules and React Compiler checks |
| `npm test`           | Run the Jest user-story suite                     |
| `npm run test:ci`    | Run tests with coverage in CI mode                |
| `npm run export:web` | Produce a static web export                       |
| `npm run format`     | Format source and documentation                   |

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
