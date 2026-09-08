# Account and login help

_Last updated: 2026-09-08._

This guide explains the account states used by the Firebase-backed Invite MVP and how to recover without creating duplicate Invite profiles.

## Account model

Invite separates identity from application data:

```text
Firebase Authentication
  -> proves who you are
  -> supplies Firebase ID token

Invite API
  -> validates token
  -> resolves Firebase UID to stable Invite user ID

MongoDB
  -> stores Invite profile, plans and invitations
```

A Firebase account and an Invite profile are related, but they are not the same record.

## I cannot sign in with email/password

### "That email and password do not match an account"

Check:

- spelling of the email address;
- accidental spaces;
- whether you originally used Google Sign-In instead of a password;
- whether you recently changed the password.

Use **Forgot password?** if this account is supposed to use email/password.

Invite intentionally uses a generic credential error and does not reveal whether a specific email address is registered.

### Too many attempts

Firebase may temporarily rate-limit repeated authentication attempts. Wait before trying again rather than repeatedly submitting the form.

### Network error

Confirm the device has internet access, then retry. A network failure should not cause Invite to create a second profile.

## I created an account but cannot continue

### Verify your email

Email/password registration requires Firebase email verification before Invite creates an application profile.

1. Open the verification email.
2. Follow the Firebase verification link.
3. Return to Invite.
4. Choose **I've verified my email**.

If the message did not arrive, choose **Resend verification email** and check spam/junk folders.

### Verification still appears incomplete

Return to Invite after opening the verification link and explicitly refresh the verification state from the onboarding screen. If necessary, close/reopen the app and sign in again.

## "Complete your Invite profile to continue"

This means Firebase authentication succeeded but there is no mapped Invite profile yet. Complete onboarding rather than creating another Firebase account.

The API code for this state is:

```text
INVITE_PROFILE_REQUIRED
```

## "This account needs to be linked"

The API can return:

```text
ACCOUNT_LINK_REQUIRED
```

This happens when an existing Invite member already uses the same normalized email but the current Firebase identity is not mapped to that member.

Invite deliberately does **not** auto-link in this situation. Matching email text is not sufficient proof that two identities should be merged.

Until a recent-authenticated linking flow is implemented:

- do not create database mappings manually from the client;
- do not delete the existing account simply to bypass the collision;
- do not change the server to silently accept the email match;
- contact the operator/support path for investigation.

## Invite says it is having trouble connecting

If Firebase is still signed in but the API cannot confirm your Invite profile, the hardening build shows a blocking connection state with **Try again** rather than routing you into profile creation.

This protects against duplicate accounts during:

- Render cold starts;
- temporary network failure;
- API outage;
- MongoDB connectivity problems;
- request timeout.

Retry when connectivity is restored. If the server repeatedly rejects the session, sign out and sign in again.

## Password reset

1. Open **I already have an account**.
2. Enter your email address.
3. Choose **Forgot password?**.
4. Follow the Firebase email instructions.
5. Return to Invite and sign in with the new password.

A password reset changes Firebase credentials. It must not create a new Invite member or identity mapping.

## Google Sign-In

On supported Android builds:

1. Open the sign-in screen.
2. Choose **Continue with Google**.
3. Select the intended Google account.
4. Complete onboarding if this is a new Invite identity.

A Play-installed build is signed by the Play App Signing certificate. Google OAuth configuration must include the Android package and the SHA-1 for that signing certificate. A direct APK can use a different certificate and therefore exercises a different OAuth client registration.

## I chose the wrong Google account

Sign out of Invite, then start Google Sign-In again and choose the intended account when the Android account chooser permits it. Invite logout also attempts to clear the native Google sign-in session.

## Session restoration

Firebase normally restores its native session after an application restart. Invite then resolves the Firebase identity to the stable Invite profile and reloads domain data.

A restart should not require registration again. If onboarding appears for an established account, do not submit a duplicate profile immediately; first check for a server/session error and retry.

## Signing out

For a Firebase/MongoDB account, signing out ends the active Firebase/Invite session. It does not delete the account or profile.

Demo/local preview sessions are different: their local demonstration data can remain on the device after sign-out.

## When contacting support

Provide:

- approximate time of the problem;
- app version/versionCode if visible;
- whether the app came from Google Play or a direct test APK;
- which action failed;
- exact user-visible error text;
- whether Wi-Fi/mobile data changed;
- whether email/password or Google Sign-In was used.

Do **not** send passwords, Firebase ID tokens, recovery links, private keys, signing files or MongoDB connection strings.
