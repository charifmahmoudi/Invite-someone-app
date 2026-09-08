# GitHub issue backlog

This file is the publishable source for the initial **Invite MVP Delivery** project backlog. Create issues in the listed order and add them to the MVP project. Keep detailed acceptance criteria in each issue; do not use this file as a substitute for issue status.

| Priority | Title                                                        | Labels                                  | Depends on            |
| -------- | ------------------------------------------------------------ | --------------------------------------- | --------------------- |
| P0       | Finalize MVP stories and Given/When/Then acceptance criteria | `mvp`, `documentation`                  | —                     |
| P0       | Build machine-verifiable story traceability                  | `mvp`, `ci`, `testing`                  | Story criteria        |
| P0       | Create deterministic isolated E2E fixtures and reset         | `mvp`, `e2e`, `backend`                 | Story criteria        |
| P0       | Add MongoDB/API integration test suite                       | `mvp`, `testing`, `backend`, `security` | E2E fixtures          |
| P0       | Verify US-01, US-02, and US-13: authentication and profiles  | `mvp`, `user-story`, `e2e`              | Fixtures, API tests   |
| P0       | Verify US-03, US-11, and US-12: people discovery             | `mvp`, `user-story`, `e2e`              | Fixtures              |
| P0       | Verify US-04, US-07, and US-09: activities and participation | `mvp`, `user-story`, `e2e`              | Fixtures, API tests   |
| P0       | Verify US-05 and US-06: invitation lifecycle                 | `mvp`, `user-story`, `e2e`              | Fixtures, API tests   |
| P1       | Verify US-08 and US-10: saved plans and safety               | `mvp`, `user-story`, `e2e`              | Fixtures              |
| P1       | Generate versioned HTML and PDF user manual                  | `mvp`, `documentation`, `ci`            | Story evidence        |
| P1       | Consolidate the GitHub Actions MVP evidence workflow         | `mvp`, `ci`                             | All test packages     |
| P0       | Run final MVP acceptance and reconcile release status        | `mvp`, `release`                        | All preceding P0 work |

The issue bodies should use the repository's user-story or engineering-task template and the definition of done in [MVP_DELIVERY.md](./MVP_DELIVERY.md).
