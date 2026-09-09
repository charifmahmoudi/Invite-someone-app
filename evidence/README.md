# CI-generated MVP evidence

Android E2E screenshots are generated into one directory per story:

```text
evidence/US-01/01-registration.png
evidence/US-01/02-verification.png
...
```

Do not add hand-created or manually substituted screenshots as verified evidence. A screenshot is valid only when the corresponding Maestro flow asserted the expected application state first and the GitHub Actions artifact identifies the commit and run.

Story directories are created by the E2E workflow and are intentionally not committed until a release-evidence policy explicitly requires versioned images.
