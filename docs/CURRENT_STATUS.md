# Current implementation status

This page is the single source of truth for **what has been completed, what has been proven, and what is still pending** in the Firebase/Android migration. It intentionally does not repeat setup or testing procedures; those live in the linked runbooks.

## Production safety

- Production remains on `main` with the existing compatibility/internal-auth behavior.
- Firebase migration work remains isolated on `impl/firebase-auth`.
- The production Render API and production MongoDB database have not been switched to Firebase-only auth.
- Promotion will be a direct fast-forward to `main` only after the release gates pass; no PR or merge commit is required for this migration workflow.

## Completed

### Firebase and Google identity

- Firebase project `invite-someone-app` is configured.
- Email/Password and Google sign-in providers are enabled.
- Android package is `com.charifmahmoudi.invite`.
- The Android OAuth client is registered for the current repository/E2E signing certificate.
- `google-services.json` contains both the Android OAuth client and Firebase Web OAuth client.
- Firebase Hosting serves the app homepage/privacy content and retains the Search Console verification file.

### Mobile client

- Firebase email/password registration and sign-in are implemented.
- Verification-email handling and password reset are implemented.
- Firebase session persistence and ID-token refresh are wired into the existing API adapter.
- Android Google Sign-In uses the native Credential Manager path through `react-native-nitro-google-signin`.
- Sign-out clears both Firebase and native Google sessions.
- iOS Google Sign-In is intentionally not enabled yet.

### API and identity mapping

- Express supports Firebase ID-token authentication without a Firebase Admin service-account key.
- Firebase tokens are verified against Google's published signing certificates and checked for issuer, audience, algorithm, expiry and subject.
- Firebase UIDs map to stable internal Invite user IDs through `user_identities`.
- New Invite profiles require a verified Firebase email.
- Matching email alone never links an existing Invite account; the API returns `ACCOUNT_LINK_REQUIRED` instead.

### Isolated E2E infrastructure

- Dedicated Render service: `invite-someone-api-firebase-e2e`.
- It deploys `impl/firebase-auth` with `AUTH_MODE=firebase` and auto-deploy disabled.
- Dedicated MongoDB database: `invite_firebase_e2e`.
- Canonical MongoDB indexes were bootstrapped and verified.
- Startup index maintenance was turned back off after bootstrap so normal scale-to-zero cold starts do not maintain schema indexes.

### Automated validation

- Normal CI passes TypeScript, lint, Jest/user-story tests and production web export.
- Hosted Firebase auth smoke creates a disposable real Firebase user, obtains a real ID token, proves the isolated Express API accepts it, proves an unverified user cannot provision MongoDB state, and removes the test user.
- The Firebase Android validation workflow successfully builds a release APK, verifies generated Firebase configuration, embeds the JS bundle, checks the signing certificate and exercises the isolated API boundary.
- The refreshed Android OAuth configuration passed native validation at commit `58a5a4db91d806c6f79ca896236e02b44d8f6e17`; later commits in this sequence are documentation-only.

### Documentation

- Firebase architecture/configuration is documented.
- Emulator-first Android acceptance testing is documented.
- Physical-phone testing is reduced to a short final release smoke.
- Firebase user creation, verification, password reset, MongoDB inspection, Render operation and cleanup are documented.
- Google Play testing/signing mechanisms are documented separately so repository signing, Internal App Sharing, upload signing and Play App Signing are not confused.

## Still pending

These are the remaining release gates, not missing implementation work:

1. Run the full Firebase email/password flow in a Google-Play-enabled Android emulator: registration, verification, onboarding, returning sign-in, password reset, restart/session restore and sign-out.
2. Run Google Sign-In in that emulator and confirm repeated sign-in resolves to the same Invite member.
3. Verify the resulting `members` and `user_identities` records in `invite_firebase_e2e`.
4. Prove the verified-email collision case returns `ACCOUNT_LINK_REQUIRED` without creating an identity mapping.
5. Run the short physical Android phone smoke for real email/browser handoff, Google account chooser, session restore and network behavior.
6. Create/configure the Invite app in Google Play Console and test Play-distributed installation. A Personal Play developer account already exists; no Play release has been published yet.
7. Configure a production-grade AAB/upload-key workflow and GitHub-to-Google-Play deployment only after the Play app has been bootstrapped. No permanent signing private key should be committed to this public repository.
8. Register the Google Play signing SHA-1 with Firebase before relying on Google Sign-In in Play-distributed builds.
9. Fast-forward the exact validated Firebase commit to `main`.
10. Distribute a compatible production client before switching the production API away from compatibility/internal auth.

## Release path

```text
CI + hosted auth smoke
        -> Android emulator acceptance
        -> short physical-phone smoke
        -> Google Play test distribution
        -> fast-forward validated code to main
        -> distribute compatible production client
        -> explicit production API auth cutover
```

The production API must not be switched to Firebase-only authentication while unsupported legacy mobile builds can still reach it. Use a compatible-client rollout, minimum-version gate, or temporary compatibility strategy before the final API cutover.

## Documentation map

- [Firebase Auth setup](./FIREBASE_AUTH_SETUP.md): architecture, provider configuration and trust boundaries.
- [Firebase operations and mobile testing runbook](./FIREBASE_OPERATIONS_RUNBOOK.md): exact emulator/device/user-management/E2E procedure.
- [Google Play testing guide](./GOOGLE_PLAY_TESTING.md): Play distribution and signing-certificate workflow.
- [Testing strategy](./TESTING.md): CI/E2E layers and test architecture.
- [Architecture](./ARCHITECTURE.md): broader application architecture.

Do not copy secrets, MongoDB URIs, upload keystores, private keys, OAuth client secrets or Firebase ID tokens into documentation, logs or public repository files.
