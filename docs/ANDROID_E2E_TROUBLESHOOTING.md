# Android E2E troubleshooting and instrumentation

_Owner: MVP delivery workflow_  
_Primary workflow: `Android E2E`_  
_Last updated: 2026-09-09_

This runbook documents the Android emulator evidence path and the failure modes found while making it repeatable. It is intended for maintainers diagnosing a red or cancelled [Android E2E workflow](../.github/workflows/e2e-android.yml), not as a replacement for the story acceptance criteria.

## What the workflow proves

The workflow starts a disposable MongoDB replica set and isolated Invite API, resets deterministic fixtures, builds a release APK, boots a Pixel 6/API 35 emulator, and runs every Maestro flow. Screenshots are uploaded only as artifacts; they become MVP evidence only when the complete workflow passes and a reviewer confirms that each image matches the preceding assertion.

The emulator uses:

| Concern | Configuration |
| --- | --- |
| Android target | API 35, x86_64, Pixel 6 |
| API from host | `http://127.0.0.1:4000` |
| API from APK | `http://127.0.0.1:4000`, through `adb reverse tcp:4000 tcp:4000` |
| Database | disposable MongoDB 8 replica set, `invite_android_e2e` |
| Auth mode | internal compatibility auth, deterministic demo credentials |
| Fixture guard | `E2E_FIXTURES_ENABLED=true` plus the dedicated fixture token |

The API URL must remain consistent with the reverse tunnel. If the APK is built with `10.0.2.2` while the job relies on `adb reverse`, the app can render successfully while login and data requests fail.

## Instrumentation conventions

The workflow and flow runner intentionally provide these diagnostics:

- `Run Maestro flow: <path>` identifies the exact flow being executed.
- Maestro’s assertion output identifies the first missing screen or selector.
- `~/.maestro/tests` preserves Maestro’s per-flow logs and screenshots.
- `evidence/US-XX` preserves story-specific screenshots.
- `/tmp/invite-e2e-api.log` is uploaded when the job fails.
- MongoDB container logs are uploaded when the job fails.
- The flow runner continues through all flows, records failures, and exits non-zero at the end so one failure does not hide later failures.

Do not mark a story verified from an artifact produced by a failed or cancelled workflow. Failed-run screenshots are diagnostic material only.

## Triage order

1. Check the workflow job step. If `Install dependencies`, `Generate Android project`, or `Build E2E APK` failed, troubleshoot the repository tree, lockfile, or native build before inspecting Maestro.
2. Check whether `Run emulator smoke flow` started. If it did not, inspect the preceding step and the uploaded API/MongoDB logs.
3. Find the first `Running Maestro flow` line and the first `[Failed]` or assertion error after it. Later failures may be cascading authentication failures.
4. If many flows fail to reach `Plans`, `People`, or `Invites`, inspect the sign-in boundary first: API reachability, credentials, SecureStore session, and the post-login data load.
5. If only one flow fails, inspect its selector, fixture assumptions, and whether it mutates state needed by later flows.
6. Confirm the flow order is sequential. Flows sharing the same app ID must not run concurrently because each uses `clearState: true` and the same deterministic account.
7. Review the artifact only after the run finishes. Visual review is a release gate, not a debugging substitute for assertions.

## Known failure modes and controls

### Repository tree or lockfile corruption

`npm ci` requires a valid UTF-8 `package.json` and `package-lock.json`. A malformed blob can appear present in GitHub while behaving like a missing or binary file on the runner. Verify both files from the PR ref and parse the lockfile as JSON before rerunning E2E.

### Shell parsing inside the emulator action

The Android emulator action invokes its `script` through a shell wrapper. Keep the workflow script to simple commands and put loops in `scripts/run-maestro-flows.sh`, which is validated with `bash -n`. Avoid Bash process substitution or complex multiline control flow directly inside the action input.

### Timeout and cancellation

Gradle, emulator boot, and sequential story flows can exceed a short job budget. The job timeout is 120 minutes. A cancellation before Maestro completes produces diagnostic artifacts but no acceptance evidence.

### Shared app state

The runner executes flow files one at a time in sorted order. Do not switch back to a directory-level Maestro invocation or parallel execution unless every flow receives an isolated app ID, account, and database fixture.

### Authentication and session handoff

The internal path is:

```text
Maestro form -> POST /v1/auth/login -> SecureStore session -> GET /v1/data -> /(tabs)
```

If login succeeds but the tab screen never appears, inspect the API log and the session key before changing selectors. Android SecureStore keys must contain only letters, numbers, `.`, `-`, and `_`; the current key is `invite_mongodb_session_v1`.

## Local reproduction

Run the same fast checks used by CI first:

```bash
npm ci
npm run typecheck
npm run lint
npm run test:ci
node scripts/validate-mvp-evidence.mjs
bash -n scripts/run-maestro-flows.sh
```

For a local emulator run, start the isolated API and MongoDB fixture environment, build the APK with `EXPO_PUBLIC_API_URL=http://127.0.0.1:4000`, create the reverse tunnel, install the APK, and invoke:

```bash
bash scripts/run-maestro-flows.sh
```

Never point a local or CI fixture reset at production MongoDB or the production API.

## Acceptance checklist

- [ ] CI passes for the same commit.
- [ ] API integration and fixture reset pass.
- [ ] APK build and emulator boot pass.
- [ ] Every Maestro flow passes.
- [ ] Story screenshots exist under the declared evidence directories.
- [ ] Screenshots are visually reviewed and show the asserted state.
- [ ] Evidence manifest remains truthful; no partial story is promoted to `verified` prematurely.
- [ ] The user manual references the accepted commit and workflow run.
