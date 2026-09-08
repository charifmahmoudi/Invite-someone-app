# Invite user guide

_Last updated: 2026-09-08._

Invite helps you make small, specific plans with people who share your interests. The current Android build is distributed through Google Play testing while the MVP is being hardened.

## 1. Getting started

### Install the test build

If you are an approved Google Play tester:

1. Open the Invite testing opt-in page while signed into the Google account enrolled as a tester.
2. Join/remain in the test program.
3. Choose **Download test app**.
4. Install Invite from Google Play.

If Play reports a generic install error and an older manually installed Invite APK is present, uninstall the old APK before trying the Play build again. Builds signed outside Google Play cannot be installed over a Play App Signing build when the certificates differ.

### Welcome screen

The welcome screen offers three paths:

- **Create your profile** — register or continue onboarding.
- **Explore the demo** — use local demonstration data without creating an account.
- **I already have an account** — sign in to an existing Firebase-backed account.

Demo data is for product exploration and is not a production account.

## 2. Create an account

1. Choose **Create your profile**.
2. Enter a valid email address.
3. Create a password with at least 8 characters.
4. Choose **Create account**.
5. Open the verification email sent by Firebase.
6. Return to Invite and choose **I've verified my email**.
7. Enter the name people should know you by and the city where you want to meet people.
8. Choose your interests, usual availability and connection goals.
9. Choose **Create my profile**.

Invite requires a verified primary email before creating the Invite profile stored in the application database.

### Existing-email safety rule

If an Invite profile already uses your email but the new Firebase identity is not already linked to that profile, Invite does **not** silently merge the accounts. You may see an account-link-required message. This protects existing accounts from being claimed merely because another identity presents the same email address.

## 3. Sign in

Choose **I already have an account** from the welcome screen.

You can sign in with:

- email and password; or
- **Continue with Google** on supported Android builds.

If the email/password combination is incorrect, Invite shows a credential error without revealing whether a particular email exists.

### Forgot password

1. Open the sign-in screen.
2. Enter your email address.
3. Choose **Forgot password?**
4. Follow the reset instructions Firebase sends to that address.
5. Return to Invite and sign in with the new password.

## 4. Main navigation

Invite has four primary tabs.

### Plans

The Plans tab contains:

- your upcoming plans;
- a prompt to create a plan;
- pending-invitation notice when applicable;
- nearby/community plans you can discover;
- category filters;
- saved-plan controls.

Choose any plan card to view its details.

### People

The People tab helps you find people through common ground rather than sensitive profiling.

You can:

- search names, introductions, interests and areas;
- filter by interests;
- filter by usual availability;
- filter by connection goal;
- use approximate-distance options when location data is available;
- switch between list and approximate-area map views;
- open a member profile.

Approximate map positions are broad area centroids. Invite does not need your precise live location for this feature.

### Invites

The Invites tab has **Received** and **Sent** views.

For a pending received invitation you can choose:

- **I'm in** to accept; or
- **Not this time** to decline.

For a pending invitation you sent, you can cancel the invitation.

Invitation responses are intentionally low-pressure. Declining is a normal outcome.

### You

The You tab contains your profile, preferences, hosted plans and sign-out action.

Choose **Edit profile** to update your introduction and preferences.

## 5. Create a plan

From Plans, choose **Create**.

The current plan form asks for:

- title;
- description;
- category;
- date and time;
- meeting place;
- city;
- total group size;
- vibe;
- community or invite-only visibility.

After creating a plan, Invite opens the invite-people step. You can select recommended people, add a short personal note and send invitations, or skip invitations for now.

### Community vs invite-only

**Community** plans can be discovered and joined by eligible members while space remains.

**Invite-only** plans are visible only through the authorized participant/invitation paths enforced by the API.

## 6. Plan details

A plan detail page can show:

- category and visibility;
- date/time;
- meeting place and city;
- description;
- host;
- attendees and capacity;
- invitation status;
- save state;
- join action when the plan is a joinable community plan;
- invite-more action for the host;
- first-meeting safety guidance.

The MVP hardening plan includes host edit/cancel and attendee leave workflows; do not assume those actions exist until the release containing them is documented.

## 7. Profiles and trust signals

Profiles may show:

- name and handle;
- city/approximate area;
- headline and biography;
- interests;
- availability;
- connection goals;
- shared-interest context;
- hosted plans;
- verification/trust signals.

For Firebase-provisioned MVP accounts, the verification shield represents a verified primary email. It is not identity-document verification or a background check.

A reliability percentage should only be treated as meaningful after enough actual attendance history exists. The hardening work avoids presenting a new member's default score as proven reliability.

## 8. Connection problems

When Firebase is signed in but Invite cannot confirm your application profile, Invite should keep the identity intact and show a retryable server/session state. It should not create another profile simply because the backend is temporarily unavailable.

If the app reports a connection problem:

1. Confirm the phone has working internet access.
2. Switch between Wi-Fi and mobile data if appropriate.
3. Choose **Try again**.
4. If the session is rejected repeatedly, sign out and sign in again.
5. If the issue persists, record what action you were taking and contact support.

See [ACCOUNT_AND_LOGIN_HELP.md](./ACCOUNT_AND_LOGIN_HELP.md) for account-specific recovery.

## 9. Safety basics

For a first meeting:

- choose a public place;
- keep independent transport options;
- tell someone you trust where you are going;
- do not share unnecessary private information;
- leave whenever you want;
- treat every invitation as optional.

See [SAFETY_GUIDE.md](./SAFETY_GUIDE.md) for more guidance and the current safety-feature status.

## 10. Current limitations

The current hardening branch is not a statement that every public-MVP feature is finished. In particular, the MVP plan still calls for stronger plan lifecycle controls, block/report/account-deletion flows, broader automated integration coverage, and final help/safety integration in the application UI.

For engineering/release status, use [CURRENT_STATUS.md](./CURRENT_STATUS.md). For the target MVP definition, use [MVP.md](./MVP.md).
