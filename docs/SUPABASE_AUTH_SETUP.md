# Supabase Auth setup

Invite uses Supabase for authentication only. The Express API remains the authorization and business-logic boundary, and MongoDB Atlas remains the application database.

## Runtime modes

Invite can run in two authentication modes during migration:

- **Compatibility mode**: the Expo build does not contain Supabase Auth client configuration and the API uses `AUTH_MODE=internal`.
- **Supabase mode**: the Expo build contains the Supabase project URL and publishable key and the API uses `AUTH_MODE=supabase`.

Do not switch the current production API to Supabase-only authentication before a compatible mobile build is available. Already-installed internal-auth binaries cannot authenticate against an API that accepts only Supabase access tokens.

## Supabase project

The connected development project is `Invite Someone App`.

Supabase Auth owns:

- email OTP identity verification;
- Google identity federation;
- access/refresh sessions.

Supabase Postgres is not the Invite application database. Profiles, activities, invitations, saved activities and provider-to-Invite identity mappings remain in MongoDB.

## Expo configuration

Set these public build variables:

```bash
EXPO_PUBLIC_API_URL=https://your-supabase-enabled-invite-api.example
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

The project URL and publishable key are public client configuration. Never place a Supabase secret/service-role key, MongoDB URI, or another server credential in an `EXPO_PUBLIC_*` variable.

Managed authentication activates only when both the Invite API and Supabase client configuration are present. Without them, Invite preserves the compatibility password/demo flow.

## Invite API configuration

Configure the isolated development/E2E API with:

```bash
AUTH_MODE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=invite_auth_dev
```

A Supabase service-role key is not required for the current API design. The API validates bearer sessions against Supabase Auth's authenticated-user endpoint using the public project key and the caller's access token.

Run index maintenance after provisioning a new MongoDB database/environment:

```bash
npm run server:indexes
```

The `user_identities` collection maps `provider=supabase` plus the Supabase user UUID to a stable internal Invite user ID. Domain records continue to reference Invite IDs.

## Email OTP configuration

Email authentication is enabled by default in hosted Supabase projects, but `signInWithOtp` sends whichever content the email template defines. Invite's UI expects a six-digit code.

In the Supabase Dashboard:

1. Open **Authentication -> Email Templates -> Magic Link**.
2. Change the template so the message displays `{{ .Token }}` instead of relying only on a confirmation URL.
3. Keep email sign-in enabled.
4. Use a reasonable OTP expiry and rate limit for the environment.

The client calls `signInWithOtp` with `shouldCreateUser: true`, so the same email-code flow signs in an existing identity or creates a new Supabase identity. After successful verification, new identities complete Invite profile onboarding in MongoDB.

## Google configuration

Google requires one-time configuration outside this repository:

1. Create/configure the OAuth application in Google Cloud.
2. Enable Google under **Supabase Dashboard -> Authentication -> Providers -> Google**.
3. Register the required Google client IDs with Supabase.
4. Add the Supabase callback URL shown by the provider configuration to Google Cloud.
5. Add `invite://google-auth` to the Supabase Auth redirect allow list for the mobile browser flow.

Invite currently uses Supabase browser OAuth through `expo-web-browser`, then installs the returned Supabase session. A future release may move to native Google Credential Manager / native iOS Google UI if that improves UX.

## Provisioning and account safety

After Supabase verifies identity:

1. the app sends the Supabase access token to the Invite API;
2. the API validates the token with Supabase Auth;
3. the API resolves `(provider=supabase, providerSubject=<Supabase user UUID>)` in MongoDB;
4. returning users continue with their existing Invite user ID;
5. new users complete Invite profile/preferences onboarding;
6. provisioning creates the Invite member and identity mapping transactionally.

Existing internal password accounts are not silently linked by matching email. If an Invite member already uses that email, provisioning returns `ACCOUNT_LINK_REQUIRED`. A future migration/linking flow must require recent proof of control of both identities.

## Production cutover

Use a staged cutover:

1. Validate Supabase Auth against an isolated Invite API and MongoDB database.
2. Verify OTP, Google, profile provisioning, returning-user access, sign-out and authorization rules.
3. Configure production Supabase Auth and Google credentials.
4. Ship a Supabase-enabled mobile build.
5. Keep the legacy internal-auth service available for old binaries during the migration window, or enforce a minimum supported app version.
6. Retire internal password/JWT issuance only after legacy clients are no longer supported.

## Still intentionally out of scope

- Sign in with Apple;
- automated hosted-email OTP retrieval in CI;
- automatic email-only linking of legacy accounts;
- moving application data from MongoDB to Supabase Postgres;
- Cloudflare R2 media uploads.
