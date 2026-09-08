# MongoDB backend setup

_Last verified: 2026-09-08._

## Why the mobile app uses an API

The MongoDB connection string is a server credential. Android APK and iPhone IPA bundles can be inspected, so placing `MONGODB_URI` in Expo code would expose the database password.

The phone talks only to the Invite Express API. Firebase Authentication proves identity while the API owns authorization/business rules and MongoDB stores Invite application data.

For the deployed environment inventory and cutover model, see [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md).

## Configure the server

```bash
cp server/.env.example .env.server
```

Core variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | yes | Atlas/self-hosted connection string |
| `MONGODB_DB_NAME` | yes | Invite application database |
| `AUTH_MODE` | yes in managed environments | `internal` or `firebase` |
| `FIREBASE_PROJECT_ID` | when `AUTH_MODE=firebase` | pins Firebase token audience/issuer to the intended project |
| `JWT_SECRET` | internal mode only | signs compatibility Invite JWTs |
| `PORT` | no | defaults to `4000` |
| `CORS_ORIGINS` | recommended | comma-separated browser origins or `*` |

Never prefix MongoDB credentials or another server secret with `EXPO_PUBLIC_`.

The current Firebase server path does **not** require a Firebase service-account JSON/private key. It verifies Firebase ID tokens with Google's public signing certificates.

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

For Firebase development, configure `.env.server` with `AUTH_MODE=firebase`, `FIREBASE_PROJECT_ID=invite-someone-app`, and an isolated MongoDB URI/database. Then start the same Express server.

See [FIREBASE_AUTH_SETUP.md](./FIREBASE_AUTH_SETUP.md) for client/provider configuration.

## Current Render deployments

### Firebase staging

```text
Render service: invite-someone-api-firebase-e2e
URL: https://invite-someone-api-firebase-e2e.onrender.com
branch: impl/firebase-auth
auto deploy: off
region: Virginia
runtime: Node
build: npm ci
start: npm run server:start
AUTH_MODE=firebase
FIREBASE_PROJECT_ID=invite-someone-app
MONGODB_DB_NAME=invite_firebase_e2e
MONGODB_ENSURE_INDEXES_ON_START=false during normal operation
```

### Production

```text
Render service: invite-someone-api
URL: https://invite-someone-api.onrender.com
branch: main
auto deploy: off
health check: /health
MONGODB_DB_NAME=invite_someone
AUTH_MODE: compatibility/internal until explicit production cutover
```

Production must remain untouched during Firebase staging acceptance.

Because Render auto-deploy is disabled, branch HEAD and live deployed commit are independent. Verify both before attributing backend behavior to a source revision.

## Render/Atlas configuration rules

Keep `MONGODB_URI` in Render environment settings. Do not commit it or copy it into Expo build variables.

After creating or changing an environment:

1. restrict Atlas access to the deployment as tightly as practical;
2. create/verify indexes with `npm run server:indexes` or a controlled bootstrap;
3. set `MONGODB_ENSURE_INDEXES_ON_START=false` after bootstrap;
4. verify `/health`;
5. test an authenticated request through the real Firebase identity boundary;
6. rebuild the phone binary only when changing public client configuration such as `EXPO_PUBLIC_API_URL` or Firebase/Google client config.

Free/scale-to-zero services may sleep after inactivity, so the first request after a quiet period can be slower.

## Connect a development client

Compatibility/internal mode only needs:

```bash
EXPO_PUBLIC_API_URL=http://127.0.0.1:4000
```

A Firebase managed-auth client uses the variables documented in [FIREBASE_AUTH_SETUP.md](./FIREBASE_AUTH_SETUP.md), including the Invite API URL and Firebase Web configuration.

Android Google Sign-In is configured natively through `google-services.json`, the Google OAuth Android client for package/signing SHA-1, and the associated Web OAuth client. No OAuth client secret or `EXPO_PUBLIC_GOOGLE_*` variables are required for the Android flow.

Android emulators commonly reach a host machine as `10.0.2.2`; physical devices need a reachable LAN/HTTPS development endpoint.

## Collections and guarantees

- `members`: private member record plus nested Invite profile and coarse GeoJSON location;
- `user_identities`: external provider subject -> stable internal Invite user ID;
- `activities`: host, content, visibility, capacity, attendee IDs and timing;
- `invitations`: sender/receiver lifecycle with a concurrency-safe active key;
- `saved_activities`: private per-member bookmarks.

In `AUTH_MODE=firebase`, Firebase ID tokens authenticate the caller, but authorization is still performed by the Invite API after resolving the internal Invite user ID.

The compatibility `members.passwordHash` field remains while old internal-auth clients are supported. Firebase-provisioned users receive an unusable random compatibility hash; their Firebase password is never stored in MongoDB.

API reads omit other members' email/auth data. Community joining uses an atomic activity update. Invitation acceptance updates attendance and invitation state in one MongoDB transaction so a full activity cannot produce a false acceptance.

## Identity mapping and linking

Firebase UIDs are mapped through `user_identities` with `provider=firebase`. Domain records always keep Invite user IDs.

If a verified Firebase email already belongs to a compatibility Invite account and there is no authenticated mapping, provisioning returns `ACCOUNT_LINK_REQUIRED`. Email matching alone never links accounts.

This invariant must be rechecked from the Google Play-installed release candidate before production promotion.

## Current release database gate

The Play-delivered acceptance suite must verify against **only** `invite_firebase_e2e`:

- one Firebase UID -> one stable Invite member;
- one corresponding `user_identities` mapping;
- repeated email/password sign-in does not duplicate the member;
- repeated Google Sign-In does not duplicate the member;
- password reset preserves the same member;
- reinstall/re-authentication preserves the same identity mapping;
- existing-email collision returns `ACCOUNT_LINK_REQUIRED` and creates no mapping.

Do not manually edit identity mappings to make acceptance pass.

## Production checklist

Before public use:

1. restrict Atlas network access to the API deployment;
2. use TLS/HTTPS for API and MongoDB connections;
3. keep development/E2E/production databases isolated;
4. complete the Play-installed Firebase acceptance suite;
5. verify Firebase Email/Password and Google provider configuration plus account-linking behavior;
6. add/confirm backups, monitoring, redacted request/audit logs and alerting;
7. run authorization and final-capacity concurrency tests against staging;
8. distribute a compatible production client before switching the production API to Firebase-only auth;
9. retire compatibility password/JWT auth only after legacy clients are no longer supported;
10. replace URL-based profile photos with moderated object-storage uploads when first-party media ships.
