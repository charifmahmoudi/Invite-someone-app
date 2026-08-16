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
- Supabase Auth establishes identity; Postgres Row Level Security and constraints authorize data.
- `EXPO_PUBLIC_*` configuration is not secret.
- A Supabase service-role key must never be embedded in or used by this application.
- Local demo mode is not authentication and must not contain real personal data.

See [Safety and privacy design](./docs/SAFETY_AND_PRIVACY.md) for launch gaps and operational expectations.
