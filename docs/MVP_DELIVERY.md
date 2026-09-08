# MVP delivery and evidence standard

## Objective

Deliver a working Invite MVP whose features are documented, decomposed into testable user stories, fully implemented, verified in automation, and explained in a screenshot-backed user manual.

## Story definition of done

A user story is `verified` only when all of the following are true:

1. Acceptance criteria are precise and independently testable.
2. Client, API, and persistence behavior is implemented as applicable.
3. Unit/domain tests cover business rules and validation.
4. API integration tests cover authorization, privacy, and transactional rules where applicable.
5. A Maestro flow exercises the story through the Android UI on the CI emulator.
6. The flow asserts the expected state before taking each required screenshot.
7. Screenshots are produced under `evidence/<story-id>/` by the same successful workflow run.
8. The user manual explains the workflow, errors, privacy behavior, and known limitations.
9. Static checks, tests, Android E2E, and evidence validation pass for the same commit.

`implemented`, `partially-tested`, `waived`, and `verified` are distinct states. A waiver never counts as a pass.

## Delivery sequence

1. Stabilize an isolated, resettable E2E API and database.
2. Strengthen story acceptance criteria and the evidence manifest.
3. Add API integration tests for trust-boundary and transactional behavior.
4. Implement Maestro journeys by feature, including failure paths.
5. Capture screenshots only after deterministic assertions.
6. Generate the user manual and traceability report in GitHub Actions.
7. Make the complete evidence workflow a required MVP release check.

## GitHub Project

Use a project named **Invite MVP Delivery** with these fields:

| Field    | Values                                             |
| -------- | -------------------------------------------------- |
| Status   | Backlog, Ready, In progress, Blocked, Review, Done |
| Feature  | The seven feature groups in `FEATURES.md`          |
| Priority | P0, P1, P2                                         |
| Evidence | Missing, Partial, Verified                         |
| Release  | MVP                                                |

Recommended views are Board by Status, Table by Feature, and Roadmap by milestone. An issue moves to Done only after its pull request and required checks are complete.

## Work packages

| Order | Issue title                                  | Outcome                                                                                       |
| ----- | -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1     | Finalize MVP stories and acceptance criteria | Every criterion can be mapped to an automated check or an explicit justified manual check     |
| 2     | Build story traceability validation          | CI rejects missing implementation, test, E2E, screenshot, or manual references                |
| 3     | Create deterministic E2E fixtures            | Every flow starts from known isolated data and can be repeated safely                         |
| 4     | Add API integration suite                    | Authentication, authorization, privacy, identity, and transaction invariants are proven       |
| 5     | Verify authentication and profiles           | US-01, US-02, and US-13 meet the definition of done                                           |
| 6     | Verify people discovery                      | US-03, US-11, and US-12 meet the definition of done                                           |
| 7     | Verify activities and participation          | US-04, US-07, and US-09 meet the definition of done                                           |
| 8     | Verify invitation lifecycle                  | US-05 and US-06 meet the definition of done with a multi-user flow                            |
| 9     | Verify saved plans and safety                | US-08 and US-10 meet the definition of done                                                   |
| 10    | Generate the user manual                     | CI produces versioned HTML/PDF documentation from verified evidence                           |
| 11    | Consolidate MVP evidence workflow            | One required GitHub Actions workflow publishes the release evidence bundle                    |
| 12    | Run MVP acceptance and reconcile status      | Documentation records the exact accepted commit, run, limitations, and remaining release work |

## Required GitHub Actions stages

```text
quality -> API integration -> Android build -> emulator E2E
        -> evidence validation -> user manual -> MVP acceptance bundle
```

The emulator target remains API 35, x86_64, Pixel 6 with KVM acceleration. The test environment must never point at the production API or production MongoDB database.
