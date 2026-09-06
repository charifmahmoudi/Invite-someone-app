# Contributing

## Development workflow

1. Create a focused branch from `main`.
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
- Test authorization with at least two unrelated users plus a host and invitee.
- Keep transactional invariants—capacity and invitation acceptance/attendance—inside the Express/MongoDB server boundary.
- Do not silently link accounts by matching email; identity migration requires recent proof of both identities.
- Update `docs/DATA_MODEL.md`, `docs/ARCHITECTURE.md`, and relevant setup docs when trust boundaries or storage change.

## Security configuration

- Firebase Web configuration and OAuth client IDs are public identifiers and may be present in Expo builds.
- OAuth client secrets, Firebase service-account/private keys, Firebase ID tokens, MongoDB URIs and real member data are secrets/sensitive data and must not be committed or exposed through `EXPO_PUBLIC_*`.
- The current Firebase token verifier intentionally uses Google's public signing certificates and does not need Firebase Admin credentials.

## Change checklist

- [ ] Scope and user outcome are clear
- [ ] User story/acceptance criteria updated
- [ ] Tests added or a manual-only reason documented
- [ ] Type-check, lint, tests, and export pass
- [ ] Android and iOS behavior considered
- [ ] Loading, empty, error, and accessibility states checked
- [ ] Privacy, abuse, and authorization impact reviewed
- [ ] Documentation matches the implemented architecture
- [ ] No credentials, bearer tokens, personal data, build products, or local environment files included
