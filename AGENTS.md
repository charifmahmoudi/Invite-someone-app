# Repository guidance

- Read the exact Expo SDK 57 documentation at https://docs.expo.dev/versions/v57.0.0/ before changing platform APIs.
- Preserve strict TypeScript and route all product mutations through `AppProvider`.
- Keep authorization and concurrent integrity in Supabase RLS, constraints, or transactional functions—not only in the client.
- Map behavior changes to `docs/USER_STORIES.md` and an automated test where practical.
- Run `npm run typecheck`, `npm run lint`, `npm run test:ci`, and the web export before handing off changes.
- Never commit `.env`, credentials, access tokens, real member data, or a Supabase service-role key.
