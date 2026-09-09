# Repository guidance

- Read the exact Expo SDK 57 documentation before changing platform APIs.
- Preserve strict TypeScript and route product mutations through `AppProvider` and the Invite API.
- Treat Firebase Authentication as identity only; authorization and concurrent domain integrity belong in the Express API and MongoDB transactions/constraints.
- Keep external provider UIDs behind `user_identities`; domain records reference stable Invite user IDs.
- Never link an existing Invite account by email alone. Legacy-account linking requires recent proof of control of both identities.
- Map behavior changes to `docs/USER_STORIES.md` and an automated test where practical.
- Run `npm run typecheck`, `npm run lint`, `npm run test:ci`, and the production web export before handing off changes.
- Never commit `.env`, MongoDB credentials, Firebase ID tokens, OAuth client secrets, Firebase service-account keys, or real member data.
- Firebase Web config and Google OAuth client IDs are public client identifiers; service-account/private keys are not.
