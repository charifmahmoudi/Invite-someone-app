# Deterministic E2E fixtures

The Android acceptance suite uses a dedicated MongoDB database with stable member, activity, invitation, and saved-activity IDs. Resetting those records makes Maestro flows independent and repeatable.

## Safety boundary

The fixture endpoints are unavailable by default. They become reachable only when all of these server conditions hold:

```text
E2E_FIXTURES_ENABLED=true
MONGODB_DB_NAME contains a distinct e2e or test segment
E2E_FIXTURES_TOKEN is at least 32 characters
```

Every request must also provide the exact token as a bearer credential. Token comparison is timing-safe. If fixture configuration is disabled or unsafe, the API returns `404`; an incorrect credential returns `401`.

The production database `invite_someone` cannot satisfy the database-name guard. The CI reset script independently rejects the production Render URL. These independent checks reduce the chance that a configuration mistake could delete production data.

## Endpoints

Both endpoints exist under `/v1/e2e` only behind the safety boundary:

- `GET /ready` waits for MongoDB and returns stable fixture IDs. CI retries this read to accommodate a bounded Render cold start.
- `POST /reset` removes data from the five Invite collections and recreates the canonical deterministic dataset.

`POST /reset` optionally accepts up to 20 Firebase identity mappings. Each mapping must reference a known fixture member. This allows a CI job that creates disposable Firebase users to bind their real Firebase UIDs to deterministic Invite members without adding an authentication bypass.

```json
{
  "firebaseIdentities": [
    {
      "userId": "profile-me",
      "providerSubject": "firebase-test-uid",
      "email": "disposable-test-user@example.invalid",
      "emailVerified": true
    }
  ]
}
```

Do not commit a real UID, email address, token, MongoDB URI, or Firebase ID token.

## GitHub configuration

Configure the isolated API with the three guarded variables above. Store the same fixture token as the protected GitHub repository secret `INVITE_E2E_FIXTURES_TOKEN`. The `Android E2E` workflow calls `scripts/reset-e2e-fixtures.sh` before building and launching the app.

The workflow must target an isolated API through `INVITE_E2E_API_URL` or its manual `api_url` input. It refuses the production API URL explicitly.

## Fixture inventory

The reset uses `src/data/seed.ts` as its canonical product dataset. Stable IDs include:

- members: `profile-me`, `profile-maya`, `profile-jonas`, `profile-sofia`, `profile-nadia`, `profile-luis`, and `profile-emma`;
- activities: `activity-walk`, `activity-dumplings`, `activity-sketch`, `activity-games`, and `activity-run`;
- invitations from the canonical seed dataset;
- saved activity: `profile-me:activity-sketch`.

Internal-auth compatibility E2E signs in as `demo@invite.app` using the documented fixture password. Managed-auth E2E should use disposable Firebase identities and pass their mappings only through the protected reset request.

## Local verification

Use a database name such as `invite_local_e2e`, enable fixtures, and supply a random token:

```bash
export NODE_ENV=test
export MONGODB_DB_NAME=invite_local_e2e
export E2E_FIXTURES_ENABLED=true
export E2E_FIXTURES_TOKEN='replace-with-a-random-value-at-least-32-characters'
npm run server:start
```

In another shell, point `EXPO_PUBLIC_API_URL` at the local API and run `bash scripts/reset-e2e-fixtures.sh`. Never use a shared or production database for local fixture work.
