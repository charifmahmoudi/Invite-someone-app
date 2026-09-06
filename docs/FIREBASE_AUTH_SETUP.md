# Firebase Auth setup

Invite uses Firebase Authentication for identity only. The Express API remains the authorization and business-logic boundary, and MongoDB Atlas remains the application database.

## Runtime modes

Invite keeps two authentication modes during migration:

- **Compatibility mode**: no complete Firebase client configuration is embedded in the Expo build and the API uses `AUTH_MODE=internal`.
- **Firebase mode**: the Expo build contains Firebase public client configuration and the API uses `AUTH_MODE=firebase`.

Do not switch the current production API to Firebase-only authentication before a compatible mobile build is available. Older internal-auth binaries cannot authenticate against an API that accepts only Firebase ID tokens.

## Connected Firebase project

Development project:

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

Firebase Web configuration identifies the client and is designed to ship in the app. It is not a Firebase Admin credential. Never place Firebase service-account JSON, private keys, OAuth client secrets, or MongoDB credentials in `EXPO_PUBLIC_*` variables.

Managed authentication activates only when the Invite API URL and complete Firebase client configuration are present. Without them, Invite preserves the compatibility password/demo path.

## Google sign-in

Android Google sign-in uses the native `react-native-nitro-google-signin` integration and Android Credential Manager. The native Google ID token is exchanged for a Firebase credential with `GoogleAuthProvider.credential()` and `signInWithCredential()`.

Android configuration is split between:

- `google-services.json`, registered for package `com.charifmahmoudi.invite` and referenced from `expo.android.googleServicesFile`;
- a Google OAuth **Android** client registered for the same package and the signing certificate SHA-1;
- the Firebase/Google-generated **Web** OAuth client contained in `google-services.json`, which the native library auto-detects for ID-token issuance.

No OAuth client secret and no `EXPO_PUBLIC_GOOGLE_*` variables are required for the Android flow.

Every Android signing identity that will ship needs a matching OAuth registration. A development/debug certificate, a locally signed release, and Google Play App Signing can have different SHA-1 fingerprints; register the actual signing certificate used for each build channel instead of reusing or guessing one.

Google sign-in is currently enabled on Android only. iOS stays disabled until its Firebase/Google native app configuration is added and validated.

## Invite API configuration

The Firebase-enabled API needs only the project ID for authentication:

```bash
NODE_ENV=production
AUTH_MODE=firebase
FIREBASE_PROJECT_ID=invite-someone-app
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=invite_auth_dev
CORS_ORIGINS=*
```

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

## Staged rollout

1. Enable Email/Password and Google in the Firebase project.
2. Register the Android Firebase app and OAuth clients for the actual signing certificate.
3. Build and validate the native Firebase-enabled Android client on an implementation branch.
4. Configure the isolated Invite API with `AUTH_MODE=firebase` and `FIREBASE_PROJECT_ID=invite-someone-app`.
5. Run required MongoDB index maintenance against the isolated auth database.
6. Verify registration, email verification, password reset, sign-in, sign-out, profile provisioning, returning-user access, and Google sign-in against isolated data.
7. Add real Firebase-authenticated API/device tests against isolated data.
8. Ship a Firebase-enabled production build before switching the production API away from internal compatibility auth.
9. Retire internal password/JWT issuance only after unsupported legacy clients can no longer reach the production API.

## Still intentionally out of scope

- Sign in with Apple;
- automatic email-only linking of legacy accounts;
- moving Invite domain data out of MongoDB;
- Cloudflare R2 media uploads;
- Firebase Admin service-account credentials unless a future server feature truly requires Admin APIs.
