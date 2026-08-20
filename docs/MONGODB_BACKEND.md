# MongoDB backend setup

## Why the mobile app uses an API

The MongoDB connection string is a server credential. Android APK and iPhone IPA bundles can be inspected, so placing `MONGODB_URI` in Expo code would give every installer the database password. The phone receives only `EXPO_PUBLIC_API_URL`; the Express API owns database access, authentication, authorization, validation, and concurrency rules.

## Configure the server

```bash
cp server/.env.example .env.server
```

| Variable               | Required in production | Purpose                                   |
| ---------------------- | ---------------------- | ----------------------------------------- |
| `MONGODB_URI`          | Yes                    | Atlas/self-hosted connection string       |
| `MONGODB_DB_NAME`      | Yes                    | Database name, normally `invite_someone`  |
| `JWT_SECRET`           | Yes                    | 32+ character access-token signing secret |
| `PORT`                 | No                     | HTTP port, defaults to `4000`             |
| `CORS_ORIGINS`         | Recommended            | Comma-separated browser origins or `*`    |
| `GEOCODING_BASE_URL`   | No                     | Swappable city geocoder endpoint          |
| `GEOCODING_USER_AGENT` | Recommended            | Identifies this API to the geocoder       |

The committed fallback URI is local development access only. `.env.server` is ignored by Git. Do not prefix server secrets with `EXPO_PUBLIC_`, paste them into GitHub Actions, or commit them.

Use a MongoDB deployment that supports transactions. Atlas replica sets do; a standalone local `mongod` should be converted to a single-node replica set for the invitation-acceptance integration test. The API creates its unique, lookup, and geospatial indexes on startup and reuses one pooled `MongoClient`, following the official [MongoClient connection guidance](https://www.mongodb.com/docs/drivers/node/current/connect/mongoclient/) and [transaction API](https://www.mongodb.com/docs/drivers/node/current/crud/transactions/).

## Run and seed

```bash
npm ci
npm run server:seed
npm run server:dev
curl http://localhost:4000/health
```

Seeding is intentionally non-destructive: it refuses to run when any application collection already contains data. The fictional review login is `demo@invite.app` / `invite-demo`.

## Deploy the free Render API

The root `render.yaml` defines a free Node web service in Render's Virginia region, close to the Atlas `US_EAST_1` deployment. It installs with `npm ci`, starts with `npm run server:start`, checks `/health`, and runs `npm run server:seed` only after the first successful deployment.

Keep `MONGODB_URI` in Render's encrypted environment settings. The Blueprint marks it with `sync: false`, so the credential is never committed. Render generates `JWT_SECRET`; `MONGODB_DB_NAME` remains `invite_someone`.

After creating the service:

1. retrieve the service's shared outbound CIDR ranges and add only those ranges to the Atlas IP access list;
2. wait for `/health` to return `{ "status": "ok" }`;
3. verify the demo login and authenticated `/v1/data` response;
4. keep the workflow's live Render URL or set the GitHub Actions variable `INVITE_API_URL` to override it, without a trailing slash;
5. rebuild the phone binaries because `EXPO_PUBLIC_API_URL` is embedded at build time.

Render free services sleep after inactivity, so the first request after a quiet period can take longer. Auth screens warm the service in the background and use a bounded 45-second request timeout with a retryable message. Registration and login return the secure session plus initial app data together, so a completed account write cannot be misreported because a second bootstrap request failed.

## Connect a development client

Create a local `.env`:

```bash
EXPO_PUBLIC_API_URL=http://127.0.0.1:4000
```

`127.0.0.1` works for the iOS simulator and web. Android emulators commonly reach the host as `10.0.2.2`; physical devices need a reachable LAN URL for development. Installable release builds should use a deployed HTTPS endpoint.

## Build connected phone binaries

Set `EXPO_PUBLIC_API_URL` in the environment that runs Expo prebuild/EAS. The repository's GitHub Android workflow defaults to `https://invite-someone-api.onrender.com`; a repository Actions variable named `INVITE_API_URL` can override it. For EAS, configure the corresponding build environment variable. A public API URL is not a secret, but it must point to a running server.

Changing the URL requires a new binary. MongoDB credentials can be rotated or changed on the server without rebuilding the app.

## Collections and guarantees

- `members`: private email/password hash plus a nested public profile and coarse GeoJSON centroid;
- `activities`: host, content, visibility, capacity, attendee IDs, and timing;
- `invitations`: sender/receiver lifecycle with a concurrency-safe active key;
- `saved_activities`: private per-member bookmarks.
- `location_cache`: city-only geocoding results and misses, cached to avoid repeat public requests.

City geocoding is performed only by the API, never directly by a phone. It sends the member-provided city name—not a street address or device position—serializes external requests to at most one per second, uses an identifying user agent, and caches results in MongoDB. The default public Nominatim endpoint is appropriate only for a moderate MVP under its [usage policy](https://operations.osmfoundation.org/policies/nominatim/); `GEOCODING_BASE_URL` can be changed on Render without shipping a new mobile binary. Map tiles come from OpenFreeMap and retain required map attribution.

Passwords use bcrypt. JWTs expire after 30 days and are stored with Expo SecureStore on native devices. API reads omit other members’ email addresses. Community joining uses one atomic activity update. Accepting an invitation updates attendance and invitation state in one MongoDB transaction so a full activity cannot produce a false acceptance.

## Production checklist

Before public use:

1. restrict Atlas network access to the API deployment;
2. use TLS/HTTPS on both API and MongoDB connections;
3. replace the development JWT secret and establish rotation/revocation procedures;
4. add managed backups, monitoring, request/audit logs with redaction, and alerting;
5. run authorization and final-capacity concurrency tests against a staging replica set;
6. add report/block/moderation and account export/deletion operations;
7. replace URL-based profile photos with moderated object-storage uploads and signed transformations.
