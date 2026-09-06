# MongoDB backend setup

## Why the mobile app uses an API

The MongoDB connection string is a server credential. Android APK and iPhone IPA bundles can be inspected, so placing `MONGODB_URI` in Expo code would expose the database password.

The phone talks only to the Invite Express API. In the target architecture, Supabase Auth proves identity while the API owns authorization/business rules and MongoDB stores Invite application data.

## Configure the server

```bash
cp server/.env.example .env.server
```

Core variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | yes | Atlas/self-hosted connection string |
| `MONGODB_DB_NAME` | yes | Invite application database |
| `AUTH_MODE` | yes in managed environments | `internal` or `supabase` |
| `SUPABASE_URL` | when `AUTH_MODE=supabase` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | when `AUTH_MODE=supabase` | public project key used with the caller token for Auth validation |
| `JWT_SECRET` | internal mode only | signs compatibility Invite JWTs |
| `PORT` | no | defaults to `4000` |
| `CORS_ORIGINS` | recommended | comma-separated browser origins or `*` |

Never prefix MongoDB credentials or another server secret with `EXPO_PUBLIC_`.

The current Supabase-auth server path does not require a Supabase service-role key.

## MongoDB requirements

Use a deployment that supports transactions. Atlas replica sets do; a standalone local `mongod` should be converted to a single-node replica set before testing invitation-acceptance concurrency.

The API opens MongoDB lazily and reuses one pooled `MongoClient` with a small scale-to-zero-friendly pool. Index maintenance is explicit rather than repeated at each cold start:

```bash
npm run server:indexes
```

Seeding also ensures required indexes before inserting fictional development records:

```bash
npm run server:seed
```

## Run locally

For internal-auth compatibility development:

```bash
npm ci
npm run server:seed
npm run server:dev
curl http://localhost:4000/health
```

For Supabase Auth development, configure `.env.server` with `AUTH_MODE=supabase`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and the isolated MongoDB URI/database. Then start the same Express server.

See [SUPABASE_AUTH_SETUP.md](./SUPABASE_AUTH_SETUP.md) for the client and provider configuration.

## Render deployment

Keep `MONGODB_URI` in Render's environment settings. Do not commit it or copy it into Expo build variables.

For a Supabase-enabled service configure:

```bash
NODE_ENV=production
AUTH_MODE=supabase
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=invite_auth_dev
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
CORS_ORIGINS=*
```

`SUPABASE_URL` and the publishable key are not secrets, but they belong in the API environment so token validation is explicitly tied to the intended Supabase project.

After creating a new environment:

1. allow only the deployment's required outbound network ranges in Atlas;
2. create/verify indexes with `npm run server:indexes` or equivalent maintenance;
3. verify `/health`;
4. test an authenticated request through the real identity boundary;
5. rebuild the phone binary when changing `EXPO_PUBLIC_API_URL` or Supabase public client configuration.

Free services may sleep after inactivity, so the first request after a quiet period can be slower.

## Connect a development client

Compatibility/internal mode only needs:

```bash
EXPO_PUBLIC_API_URL=http://127.0.0.1:4000
```

A managed-auth client uses:

```bash
EXPO_PUBLIC_API_URL=https://your-supabase-enabled-invite-api.example
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Android emulators commonly reach a host machine as `10.0.2.2`; physical devices need a reachable LAN/HTTPS development endpoint.

## Collections and guarantees

- `members`: private member record plus nested Invite profile and coarse GeoJSON location;
- `user_identities`: external provider subject -> stable internal Invite user ID;
- `activities`: host, content, visibility, capacity, attendee IDs and timing;
- `invitations`: sender/receiver lifecycle with a concurrency-safe active key;
- `saved_activities`: private per-member bookmarks.

In `AUTH_MODE=supabase`, Supabase access tokens authenticate the caller, but authorization is still performed by the Invite API after resolving the internal Invite user ID.

The compatibility `members.passwordHash` field remains while old internal-auth clients are supported. Supabase-provisioned users receive an unusable random compatibility hash; they do not authenticate with that field.

API reads omit other members' email/auth data. Community joining uses an atomic activity update. Invitation acceptance updates attendance and invitation state in one MongoDB transaction so a full activity cannot produce a false acceptance.

## Production checklist

Before public use:

1. restrict Atlas network access to the API deployment;
2. use TLS/HTTPS for API and MongoDB connections;
3. use isolated development/E2E/production databases;
4. verify Supabase Auth provider configuration and account-linking behavior;
5. add backups, monitoring, redacted request/audit logs and alerting;
6. run authorization and final-capacity concurrency tests against staging;
7. add report/block/moderation and account export/deletion operations;
8. retire compatibility password/JWT auth only after legacy clients are no longer supported;
9. replace URL-based profile photos with moderated object-storage uploads when first-party media ships.
