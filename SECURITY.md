# Security policy

## Reporting a vulnerability

Please do not open a public issue for suspected vulnerabilities or real-world safety incidents. Contact the repository owner privately through the security contact configured on the GitHub account and include:

- affected version/commit;
- reproduction steps or proof of concept;
- expected and observed authorization behavior;
- potential member/data impact;
- any temporary mitigation already taken.

Do not access data that is not yours, degrade the service, contact affected members, or publish details before a fix is available.

## Supported versions

The project is currently pre-release. Only the latest commit on `main` receives security fixes.

## Security boundaries

- Mobile/web clients are untrusted.
- Firebase Authentication establishes identity; the Invite Express API owns authorization and business rules.
- MongoDB Atlas remains the application data store and is reachable only through trusted server infrastructure.
- Firebase Web configuration and Google OAuth client IDs are public identifiers and may be embedded in the client.
- Firebase service-account private keys, OAuth client secrets, MongoDB credentials and bearer ID tokens must never be embedded in the app or committed to the repository.
- The current API verifies Firebase ID tokens using Google's public signing certificates and does not require Firebase Admin credentials.
- Provider UIDs are mapped to stable internal Invite user IDs; email equality alone never links accounts.
- Local demo mode is not authentication and must not contain real personal data.

See [Architecture](./docs/ARCHITECTURE.md), [Firebase Auth setup](./docs/FIREBASE_AUTH_SETUP.md), and [Safety and privacy design](./docs/SAFETY_AND_PRIVACY.md).
