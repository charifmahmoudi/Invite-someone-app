# Clerk authentication setup

Invite can run in two authentication modes without changing its product/domain model:

- **Compatibility mode**: no `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`; the existing Invite email/password client and `AUTH_MODE=internal` API remain active.
- **Clerk mode**: the publishable key is present in the Expo build and the API runs with `AUTH_MODE=clerk`.

Do not enable only one half of Clerk mode against the production API. Existing installed binaries use Invite-issued JWTs and will not authenticate against an API that has already switched to Clerk verification.

## 1. Create a Clerk development instance

Use an Open-access development instance for this migration.

Under **User & authentication**:

1. Require an email address.
2. Enable **Email verification code** for sign-up verification.
3. Enable **Email verification code** for email sign-in.
4. Disable password authentication for the Clerk flow.
5. Keep Clerk identity requirements limited to the verified email address. Invite owns display name, city, interests, availability, and connection goals in MongoDB.

Enable the Google social connection for the development instance.

For native/mobile use, enable Clerk's Native API and register the Invite applications:

- iOS bundle ID: `com.charifmahmoudi.invite`
- Android package: `com.charifmahmoudi.invite`

Invite's custom browser SSO callback is generated from the `invite` scheme with the `sso-callback` path. Add the resulting mobile redirect URL to Clerk's mobile SSO redirect allowlist for each environment.

## 2. Configure the Expo client

Set only the publishable client key in the Expo environment:

```bash
EXPO_PUBLIC_API_URL=https://your-clerk-enabled-invite-api.example
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Never put `CLERK_SECRET_KEY`, MongoDB credentials, or any other server secret in an `EXPO_PUBLIC_` variable.

When the publishable key is absent, Invite intentionally keeps the compatibility sign-in UI. This lets existing preview and production builds continue to run during migration.

## 3. Configure the Invite API

Create a separate development/E2E API environment first. Configure:

```bash
AUTH_MODE=clerk
CLERK_ISSUER=https://your-instance.clerk.accounts.dev
CLERK_JWKS_URL=https://your-instance.clerk.accounts.dev/.well-known/jwks.json
CLERK_AUDIENCE=invite-api
CLERK_SECRET_KEY=sk_test_...
```

`CLERK_SECRET_KEY` is used only by the API when it must resolve the verified primary email from Clerk. It must stay server-side.

Run the database index maintenance command after introducing a new database/environment:

```bash
npm run server:indexes
```

The `user_identities` collection maps Clerk subjects to stable Invite user IDs. Invite authorization continues to use those internal IDs rather than leaking provider IDs throughout activity and invitation records.

## 4. Current client flow

With Clerk configured:

1. The root layout mounts `ClerkProvider` with encrypted Expo token caching.
2. The Clerk bearer token is supplied to the existing Invite API adapter.
3. Email authentication uses a privacy-preserving sign-in-or-sign-up flow with a verification code.
4. Google uses Clerk SSO in the system browser.
5. Returning mapped identities load their existing Invite profile.
6. New identities are routed to Invite's profile/preferences onboarding.
7. The API provisions the Clerk identity and Invite profile transactionally.
8. Invite state is reloaded after provisioning.
9. Signing out through the existing Invite UI also signs out the active Clerk session.

## 5. Testing Clerk without sending real email

In a Clerk development instance, Clerk supports test email aliases such as:

```text
someone+clerk_test@example.com
```

The fixed verification code is:

```text
424242
```

Do not point automated Clerk tests at the production API/database. Configure a separate E2E API and database, then enable the Clerk-specific emulator flow.

## 6. Production cutover

Use a coordinated cutover rather than flipping the production API first:

1. Validate Clerk against a separate development/E2E Invite API and MongoDB database.
2. Verify email OTP, Google, new-user provisioning, returning-user sign-in, sign-out, and existing Invite authorization rules.
3. Create/configure the Clerk production instance and production domain.
4. Configure production Google OAuth credentials and the production mobile redirect allowlist.
5. Ship a Clerk-enabled app build pointing to the Clerk-enabled production API.
6. Keep the old internal-auth API available for already-installed legacy binaries during the chosen migration window, or force a minimum supported app version before retiring internal auth.
7. Retire Invite password hashes/internal token issuance only after legacy clients are no longer supported.

## 7. Still intentionally out of scope

This integration does not yet enable:

- native Google credential-manager / iOS credential-picker UI;
- Sign in with Apple;
- automated Clerk E2E against a provisioned isolated environment;
- automatic linking of an existing Invite password account to a Clerk identity by email alone.

Email-only account linking is deliberately rejected because matching an email string is not sufficient proof for a sensitive account migration. A future linking flow should require recent authentication to both sides of the account.