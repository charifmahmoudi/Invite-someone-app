# Contributing

## Development workflow

1. Create a focused branch from `main` for normal feature work. The current Firebase release migration is intentionally staged on `impl/firebase-auth` until its acceptance gates pass.
2. Install exactly from the lockfile with `npm ci`.
3. Keep product logic in `src/domain` when it can be pure and testable.
4. Route backend reads/writes through the Invite API/AppProvider; screens must not connect directly to MongoDB.
5. Treat Firebase Authentication as identity only; add authorization/domain enforcement to the Express API in the same change.
6. Add or update an acceptance criterion and story-mapped test for behavioral changes.
7. Run all local quality gates before handoff.

```bash
npm run format
npm run typecheck
npm run lint
npm run test:ci
npm run export:web -- --output-dir dist
```

## Code conventions

- TypeScript strict mode stays enabled. Avoid `any`; validate untrusted runtime data.
- Use `@/` imports for source modules.
- Components are named exports except route modules, which use the required default export.
- Keep route components focused on rendering and interaction orchestration.
- Prefer domain names (`Invitation`, `ActivityDraft`) over transport names (`row`, `payload`) outside adapters.
- Comments should explain a non-obvious decision, invariant, or risk—not restate the code.
- Use design tokens from `src/constants/theme.ts`; do not scatter new brand colors.
- Every interactive control needs visible text or an accessibility label and an adequate touch target.
- Never treat a client-side check as authorization.
- Keep Firebase/Google provider subjects behind `user_identities`; domain data references Invite user IDs.

## Database and API changes

- Update `server/src/database.ts` collection contracts and explicit index maintenance when schema/index needs change.
- Run `npm run server:indexes` for new environments after index changes.
- Keep `MONGODB_ENSURE_INDEXES_ON_START=false` during normal operation; use the startup bootstrap flag only deliberately.
- Test authorization with at least two unrelated users plus a host and invitee.
- Keep transactional invariants—capacity and invitation acceptance/attendance—inside the Express/MongoDB server boundary.
- Do not silently link accounts by matching email; identity migration requires recent proof of both identities.
- Update `docs/DATA_MODEL.md`, `docs/ARCHITECTURE.md`, and relevant setup docs when trust boundaries or storage change.

## Deployment changes

Any change that affects hosting, environment variables, CI/CD, Android signing, Google Play, Firebase project configuration, API URLs, release promotion, or rollback must update the appropriate deployment documentation in the same change.

At minimum review:

- `docs/DEPLOYMENT_ARCHITECTURE.md` — environment inventory, Render/Play/GitHub topology, secrets, promotion and rollback;
- `docs/CURRENT_STATUS.md` — completed evidence and remaining release gate;
- `docs/GOOGLE_PLAY_TESTING.md` — track/signing/listing/tester behavior;
- `docs/FIREBASE_OPERATIONS_RUNBOOK.md` — operator procedure;
- `.env.example` / `server/.env.example` — variable names and public-vs-secret boundary.

Do not document a branch as deployed merely because it is at HEAD. Render auto-deploy is disabled for the current staging and production APIs, so source revision and live deployment revision must be verified separately.

For Android release changes, record the correct signing role. The direct staging APK, Play upload key, and Play App Signing key are distinct identities.

Do not bump Android versionCode for store-listing, tester-list, or generic Play-install problems. Bump it only when creating a genuinely new Play bundle or when Play reports the exact version-code collision for that upload.

## Security configuration

- Firebase Web configuration and OAuth client IDs are public identifiers and may be present in Expo builds.
- OAuth client secrets, Firebase service-account/private keys, Firebase ID tokens, MongoDB URIs, Play upload keystores/passwords, signing private keys and real member data are secrets/sensitive data and must not be committed or exposed through `EXPO_PUBLIC_*`.
- The current Firebase token verifier intentionally uses Google's public signing certificates and does not need Firebase Admin credentials.
- GitHub-to-Google-Play API authentication uses Workload Identity Federation; do not replace it with a checked-in or long-lived service-account JSON key.

## Change checklist

- [ ] Scope and user outcome are clear
- [ ] User story/acceptance criteria updated
- [ ] Tests added or a manual-only reason documented
- [ ] Type-check, lint, tests, and export pass
- [ ] Android and iOS behavior considered
- [ ] Loading, empty, error, and accessibility states checked
- [ ] Privacy, abuse, and authorization impact reviewed
- [ ] Documentation matches the implemented architecture
- [ ] Deployment/runtime docs updated when infrastructure or release flow changed
- [ ] Live deployment revision checked separately from branch HEAD when relevant
- [ ] No credentials, bearer tokens, personal data, build products, keystores, or local environment files included
