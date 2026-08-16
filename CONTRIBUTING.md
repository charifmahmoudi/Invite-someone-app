# Contributing

## Development workflow

1. Create a focused branch from `main`.
2. Install exactly from the lockfile with `npm ci`.
3. Keep product logic in `src/domain` when it can be pure and testable.
4. Route backend writes through `AppProvider`; screens must not query Supabase directly.
5. Add or update an acceptance criterion and story-mapped test for behavioral changes.
6. Run all local quality gates before opening a pull request.

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
- Never treat a client-side check as authorization. Extend RLS/constraints in the same change.

## Database changes

- Add a new timestamped migration; do not edit a migration that has shipped.
- Include indexes, constraints, and RLS for every new table.
- Test policies with at least two unrelated users plus a host and invitee.
- Keep transactional invariants—capacity, acceptance/attendance—inside Postgres.
- Update `docs/DATA_MODEL.md` and generated TypeScript types when schema generation is added.

## Pull request checklist

- [ ] Scope and user outcome are clear
- [ ] User story/acceptance criteria updated
- [ ] Tests added or a manual-only reason documented
- [ ] Type-check, lint, tests, and export pass
- [ ] Android and iOS behavior considered
- [ ] Loading, empty, error, and accessibility states checked
- [ ] Privacy, abuse, and authorization impact reviewed
- [ ] No credentials, tokens, personal data, build products, or local environment files included
