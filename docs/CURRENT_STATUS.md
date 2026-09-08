# Current implementation status

_Last verified: 2026-09-08._

This page is the single source of truth for **what has been completed, what has been proven, what has been explicitly waived, and what is still pending** in the Firebase/Android migration. Procedures live in the linked runbooks; deployment topology lives in [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md).

## Production safety

- Production remains on `main` with the existing compatibility/internal-auth behavior.
- Firebase migration work remains isolated on `impl/firebase-auth`.
- The production Render API `https://invite-someone-api.onrender.com` and production MongoDB database `invite_someone` have not been switched to Firebase-only auth.
- Render auto-deploy is off for both staging and production, so a branch update does not silently redeploy either API.
- Promotion remains a direct fast-forward to `main`; production changes must still be explicit.

## Current revisions

```text
Last functionally validated staging SHA before documentation-only changes:
113efe015bfee8e531a0e477bdef33974b5d30ff

Production main HEAD before this documentation refresh:
b5f2c59c4b24939fb8f8459ffcc008bd048dc7d6

Firebase staging Render live deploy:
ea14d8105e2d09da6aebdd9ff4f272636c7d749a

Production Render live deploy:
d050cca0dae894159ec3e54f8476f82655f9b1a2
```

Documentation-only commits after the validated staging SHA do not change the accepted application/runtime evidence. Always verify exact branch and Render deploy revisions before production promotion.

## Completed

### Firebase and Google identity

- Firebase project `invite-someone-app` is configured.
- Email/Password and Google sign-in providers are enabled.
- Android package is `com.charifmahmoudi.invite`.
- Android Google Sign-In uses native Credential Manager integration through `react-native-nitro-google-signin`.
- `google-services.json` includes OAuth configuration for the staging/test and Play App Signing identities used by the current Android path.
- Firebase Hosting serves the app homepage/privacy content and retains the Search Console verification file.

### Mobile client

- Firebase email/password registration and sign-in are implemented.
- Verification-email handling and password reset are implemented.
- Firebase session persistence and ID-token refresh feed the existing API adapter.
- Sign-out clears both Firebase and native Google sessions.
- iOS Google Sign-In remains intentionally out of scope for this Android release.

### API and identity mapping

- Express supports Firebase ID-token authentication without a Firebase Admin service-account key.
- Firebase tokens are verified against Google's published signing certificates and checked for issuer, audience, algorithm, expiry and subject.
- Firebase UIDs map to stable internal Invite user IDs through `user_identities`.
- New Invite profiles require a verified Firebase email.
- Matching email alone never links an existing Invite account; the API returns `ACCOUNT_LINK_REQUIRED` instead.
- Genuine Firebase-token boundary testing has already proven the isolated API accepts a valid token and rejects provisioning for an unverified identity.

### Isolated staging infrastructure

- Dedicated Render service: `invite-someone-api-firebase-e2e`.
- Public staging API: `https://invite-someone-api-firebase-e2e.onrender.com`.
- Render branch: `impl/firebase-auth`.
- `AUTH_MODE=firebase`.
- Auto-deploy disabled.
- Dedicated MongoDB database: `invite_firebase_e2e`.
- Canonical MongoDB indexes were bootstrapped and verified.
- Startup index maintenance is disabled during normal scale-to-zero operation.

### Google Play CI/CD

- Dedicated Google Cloud CI service account: `invite-play-ci@invite-someone-app.iam.gserviceaccount.com`.
- GitHub authenticates with keyless OIDC -> Google Cloud Workload Identity Federation.
- Current provider:

```text
projects/367720887571/locations/global/workloadIdentityPools/github-actions/providers/github
```

- Android Publisher, IAM Credentials and STS APIs are enabled.
- The Play upload keystore is supplied only through GitHub repository secrets; no signing private key is committed.
- The Firebase Android validation workflow builds and verifies a Play upload-signed AAB, authenticates with a short-lived Android Publisher token, uploads the bundle, updates the Internal testing track, validates the edit and commits it.

### Google Play Internal testing

- Internal testing contains completed Android `versionCode` **5**.
- Successful publication evidence came from GitHub Actions run `34155373675`.
- Current Internal release name is `Invite Internal 15`.
- No versionCode bump was required for store-listing or tester setup work.
- Tester list **Invite Someone Alpha Testers** contains the configured tester accounts and is selected for Internal testing.
- The tester opt-in page recognizes the active tester account and offers **Download test app**.
- Google Play displays the test build and an **Install** button.
- **Play-delivered installation on the physical test phone succeeds and the application runs on that device.**

### Play store listing

The API-visible store listing has been completed and verified:

- app title present;
- short description present;
- full description present;
- public support email present;
- 512x512 Play Store icon present;
- 1024x500 feature graphic present;
- two phone screenshots present.

Successful screenshot publication evidence:

```text
Workflow: Play Store Screenshots
Run ID: 34176724947
Result: success
Screenshots: 01-welcome.png, 02-discover.png
Dimensions: 1080x2400 each
Play verification: 2 phone screenshots
```

### Signing identities

```text
GitHub/test APK SHA-1:
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25

Play upload SHA-1:
96:55:A1:7E:35:C7:CF:DE:67:BD:3C:E9:6C:F5:22:73:99:F8:06:A3

Play App Signing SHA-1:
44:A2:72:01:D0:13:DE:A3:79:D1:41:92:67:6C:52:89:20:10:E6:56
```

These are public certificate fingerprints, not private key material.

## Explicit acceptance-suite waiver

On 2026-09-08 the release owner explicitly chose to **skip the full Play-installed functional acceptance suite** for this release candidate.

This is a **waiver, not a pass**. The following Play-installed behaviors therefore remain unverified on the physical tester device and must not be described as tested or passing:

- email/password signup;
- email verification;
- returning email/password sign-in;
- password reset;
- Google Sign-In;
- onboarding/profile provisioning;
- Firebase ID token -> Express -> MongoDB end-to-end behavior;
- session persistence after restart;
- logout behavior;
- repeated login preserving the same Invite identity;
- absence of duplicate MongoDB members under the Play-installed flow;
- existing-email collision returning `ACCOUNT_LINK_REQUIRED` under the Play-installed flow;
- background/sleep resume;
- network-change recovery;
- uninstall/reinstall or Play-update behavior.

Existing automated, emulator, API, Firebase-token-boundary and MongoDB tests remain valid evidence for the behaviors they actually exercised, but they do not replace the skipped physical-device functional acceptance suite.

## Still pending before production changes

1. Recheck Play Console App content/policy declarations before any closed-test/production submission.
2. If this Personal developer account is subject to Google's current new-account rule, complete the required closed test and production-access process.
3. Recheck exact `impl/firebase-auth` and `main` branch heads immediately before promotion.
4. Recheck the exact live staging and production Render revisions because auto-deploy is disabled.
5. Fast-forward only the intended staging code to `main` when production promotion is explicitly authorized.
6. Build/distribute a compatible production client before switching the production API away from compatibility/internal auth.
7. Verify the intended production Render deploy and `/health` response.
8. Perform the production auth cutover only as an explicit, reversible operation.

## Release path

```text
CI + hosted auth smoke
        -> Play Internal testing publication
        -> Play installation + launch on physical test phone [passed]
        -> full Play-installed functional suite [WAIVED; NOT PASSED]
        -> Play production-readiness / closed-test requirements as applicable
        -> recheck exact branch + Render revisions
        -> explicit fast-forward to main
        -> deploy compatible production client/server pair
        -> explicit production API auth cutover
```

The production API must not be switched to Firebase-only authentication while unsupported legacy mobile builds can still reach it. Use a compatible-client rollout, minimum-version gate, or temporary compatibility strategy before the final API cutover.

## Documentation map

- [Deployment architecture](./DEPLOYMENT_ARCHITECTURE.md): environments, Render services, CI/CD, Play distribution, secrets, promotion and rollback.
- [Firebase Auth setup](./FIREBASE_AUTH_SETUP.md): identity architecture, provider configuration and trust boundaries.
- [Firebase operations runbook](./FIREBASE_OPERATIONS_RUNBOOK.md): staging/device/user-management/E2E procedure.
- [Google Play testing guide](./GOOGLE_PLAY_TESTING.md): Play track, signing, listing and tester workflow.
- [Testing strategy](./TESTING.md): CI/E2E layers and acceptance architecture.
- [Architecture](./ARCHITECTURE.md): broader application architecture.

Do not copy secrets, MongoDB URIs, upload keystores, private keys, OAuth client secrets or Firebase ID tokens into documentation, logs or public repository files.
