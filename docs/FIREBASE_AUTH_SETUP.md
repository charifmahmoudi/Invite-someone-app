# Firebase Auth setup

_Last verified: 2026-09-08._

Invite uses Firebase Authentication for identity only. The Express API remains the authorization and business-logic boundary, and MongoDB Atlas remains the application database.

For current migration progress, see [CURRENT_STATUS.md](./CURRENT_STATUS.md). For deployment/runtime topology, see [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md). For the repeatable operator procedure, use [FIREBASE_OPERATIONS_RUNBOOK.md](./FIREBASE_OPERATIONS_RUNBOOK.md).

## Runtime modes

Invite keeps two authentication modes during migration:

- **Compatibility mode**: no complete Firebase client configuration is embedded in the Expo build and the API uses `AUTH_MODE=internal`.
- **Firebase mode**: the Expo build contains Firebase public client configuration and the API uses `AUTH_MODE=firebase`.

Do not switch the production API to Firebase-only authentication before a compatible Play-delivered mobile build has passed acceptance. Older internal-auth binaries cannot authenticate against an API that accepts only Firebase ID tokens.

## Connected Firebase project

```text
project ID: invite-someone-app
project number: 367720887571
Android package: com.charifmahmoudi.invite
iOS bundle ID: com.charifmahmoudi.invite
```

Firebase owns email/password credentials, verification emails, password resets, Google identity, and Firebase sessions. MongoDB continues to own Invite profiles, activities, invitations, saved activities, and provider-to-Invite identity mappings.

## Firebase Console configuration

Under **Authentication -> Sign-in method**:

1. enable **Email/Password**;
2. enable **Google**;
3. keep the project support email current.

Email/password works without custom SMTP. Firebase sends verification and password-reset messages through its managed authentication email system.

## Expo client configuration

Use the Firebase Web app configuration as public Expo variables:

```bash
EXPO_PUBLIC_API_URL=https://your-firebase-enabled-invite-api.example
EXPO_PUBLIC_FIREBASE_API_KEY=your_web_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=invite-someone-app.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=invite-someone-app
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=invite-someone-app.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=367720887571
EXPO_PUBLIC_FIREBASE_APP_ID=1:367720887571:web:your_web_app_id
```

Firebase Web configuration identifies the client and is designed to ship in the app. It is not a Firebase Admin credential. Never place Firebase service-account JSON, private keys, OAuth client secrets, Play signing keys, or MongoDB credentials in `EXPO_PUBLIC_*` variables.

Managed authentication activates only when the Invite API URL and complete Firebase client configuration are present. Without them, Invite preserves the compatibility password/demo path.

## Google Sign-In

Android Google Sign-In uses the native `react-native-nitro-google-signin` integration and Android Credential Manager. The native Google ID token is exchanged for a Firebase credential with `GoogleAuthProvider.credential()` and `signInWithCredential()`.

Android configuration is split between:

- `google-services.json`, registered for package `com.charifmahmoudi.invite` and referenced from `expo.android.googleServicesFile`;
- a Google OAuth **Android** client registered for the same package and the signing certificate SHA-1;
- the Firebase/Google-generated **Web** OAuth client contained in `google-services.json`, used for ID-token issuance.

No OAuth client secret and no `EXPO_PUBLIC_GOOGLE_*` variables are required for the Android flow.

Every Android signing identity that will be installed needs a matching OAuth registration. The current important channels are:

```text
GitHub/test APK SHA-1:
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25

Play upload key SHA-1:
96:55:A1:7E:35:C7:CF:DE:67:BD:3C:E9:6C:F5:22:73:99:F8:06:A3

Play App Signing SHA-1:
44:A2:72:01:D0:13:DE:A3:79:D1:41:92:67:6C:52:89:20:10:E6:56
```

The Play upload key authenticates uploads; it is not normally the installed app identity. For Google Sign-In in a build installed from Google Play, the **Play App Signing SHA-1** must be registered.

Google Sign-In is currently enabled on Android only. iOS stays disabled until its Firebase/Google native app configuration is added and validated.

## Invite API configuration

The Firebase-enabled API needs only the project ID for Firebase token verification:

```bash
NODE_ENV=production
AUTH_MODE=firebase
FIREBASE_PROJECT_ID=invite-someone-app
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=invite_firebase_e2e
MONGODB_ENSURE_INDEXES_ON_START=false
CORS_ORIGINS=*
```

`invite_firebase_e2e` is the current isolated migration-test database. Production remains on `invite_someone` with the existing compatibility path until explicit cutover. Never use a production MongoDB URI for Firebase migration E2E testing.

The current server does **not** require Firebase Admin SDK credentials. It verifies Firebase ID-token signatures against Google's published Firebase signing certificates and validates:

- `alg=RS256` and a known signing-key ID;
- `aud=invite-someone-app`;
- `iss=https://securetoken.google.com/invite-someone-app`;
- token expiry/issued-at/authentication time;
- a non-empty Firebase UID.

Signing certificates are cached according to Google's `Cache-Control` response.

## Account creation and email verification

Email registration uses Firebase `createUserWithEmailAndPassword`. Invite then sends a Firebase verification email and blocks MongoDB profile provisioning until Firebase reports `emailVerified=true`.

Password resets use Firebase's managed `sendPasswordResetEmail` flow. Invite never receives or stores the Firebase password.

After Firebase verifies identity:

1. the app sends the Firebase ID token to the Invite API;
2. the API validates that token against the configured Firebase project;
3. the API resolves `(provider=firebase, providerSubject=<Firebase UID>)` in MongoDB;
4. returning users continue with their stable internal Invite user ID;
5. new users complete Invite profile/preferences onboarding;
6. provisioning creates the Invite member and identity mapping transactionally.

## Account-linking safety

Existing internal password accounts are **not** silently linked just because Firebase returns the same email. If an Invite member already uses the verified email, provisioning returns `ACCOUNT_LINK_REQUIRED`.

A future migration/linking flow must require recent proof of control of both the old Invite account and the Firebase identity. Email-string equality alone is not sufficient proof.

## Session behavior

On React Native, Firebase session persistence uses AsyncStorage through Firebase's React Native persistence adapter. The app listens for Firebase ID-token changes and supplies `user.getIdToken()` to the existing Invite API adapter, allowing Firebase to refresh expiring tokens normally.

Invite domain state is reloaded after authentication, provisioning, or account changes. Signing out of Invite also signs out of Firebase and the native Google session.

## Staging environment

Current Firebase staging backend:

```text
Render service: invite-someone-api-firebase-e2e
URL: https://invite-someone-api-firebase-e2e.onrender.com
branch: impl/firebase-auth
auto deploy: off
AUTH_MODE=firebase
FIREBASE_PROJECT_ID=invite-someone-app
MONGODB_DB_NAME=invite_firebase_e2e
```

Because Render auto-deploy is disabled, branch HEAD and live backend revision must be checked separately. Do not assume a GitHub commit is running on Render merely because it is at branch HEAD.

## Google Play staging distribution

The migration now has a real Google Play Internal testing release:

```text
package: com.charifmahmoudi.invite
track: internal
release: Invite Internal 15
versionCode: 5
```

GitHub Actions builds the upload-key-signed AAB and publishes it through the Android Publisher API using keyless GitHub OIDC -> Google Cloud Workload Identity Federation.

The tester opt-in page and Install button are visible. The current remaining delivery issue is a generic Play Store install error on the physical device, so the Play-delivered acceptance suite has not yet passed.

## Current rollout sequence

1. **Done:** enable Email/Password and Google in Firebase.
2. **Done:** register Android Firebase/OAuth configuration for staging and Play App Signing identities.
3. **Done:** implement Firebase email/password, verification, reset, persisted sessions and native Android Google Sign-In.
4. **Done:** configure isolated Render API with `AUTH_MODE=firebase` and isolated MongoDB database.
5. **Done:** bootstrap/verify MongoDB indexes.
6. **Done:** prove the hosted real-Firebase-token API boundary and unverified-email guard.
7. **Done:** build upload-key-signed Android AAB and configure keyless GitHub-to-Play publication.
8. **Done:** publish Android `versionCode 5` to Google Play Internal testing.
9. **Done:** complete API-visible store listing text/icon/feature graphic and publish two real phone screenshots.
10. **Current:** get the Play-delivered build installed successfully on the physical tester device.
11. **Current:** run the complete Play-installed acceptance suite and verify MongoDB identity invariants.
12. **Then:** complete remaining Play Console App content/production-access requirements as applicable.
13. **Then:** fast-forward the exact accepted Firebase code to `main`.
14. **Then:** distribute a compatible production client and verify production Render health.
15. **Then:** explicitly switch production API auth mode only when unsupported compatibility clients are addressed.
16. **Later:** retire internal password/JWT issuance when safe.

## Still intentionally out of scope

- Sign in with Apple;
- automatic email-only linking of legacy accounts;
- moving Invite domain data out of MongoDB;
- Cloudflare R2 media uploads;
- Firebase Admin service-account credentials unless a future server feature truly requires Admin APIs.