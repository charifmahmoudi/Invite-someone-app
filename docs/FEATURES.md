# MVP feature catalogue

_Status date: 2026-09-08._

This document defines the product boundary for the Invite MVP. A feature is complete only when every linked user story satisfies the repository's [MVP definition of done](./MVP_DELIVERY.md). Product intent alone is not completion evidence.

| Feature                       | Purpose                                                         | User stories        | Current evidence status                                                           |
| ----------------------------- | --------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------- |
| Authentication and onboarding | Establish a member identity and relevant preferences            | US-01               | Partial: domain validation exists; complete managed-auth E2E evidence is pending  |
| Member profiles               | Let members present and maintain useful context                 | US-02, US-13        | Partial: implementation exists; complete automated UI evidence is pending         |
| People discovery              | Find compatible nearby people without exposing precise location | US-03, US-11, US-12 | Partial: domain tests exist; complete UI/map evidence is pending                  |
| Activity creation             | Create a clear, bounded community or invite-only plan           | US-04               | Partial: domain tests exist; complete UI/API evidence is pending                  |
| Invitations                   | Recommend invitees and support respectful invitation decisions  | US-05, US-06        | Partial: domain tests exist; multi-user UI/API evidence is pending                |
| Participation and trust       | Join eligible activities and understand hosts and attendance    | US-07, US-09        | Partial: reducer/constraints exist; complete UI/API evidence is pending           |
| Saved plans and safety        | Revisit activities and receive first-meeting guidance           | US-08, US-10        | Partial: reducer coverage exists; persistence and content E2E evidence is pending |

## Evidence policy

Each story must link to implementation, automated tests, an Android Maestro flow, screenshot checkpoints, and a section in the user manual. CI evidence must identify the Git commit and workflow run. Screenshots illustrate an asserted result; they do not replace an assertion.

## MVP exclusions

Push notifications, chat, moderation case management, first-party media upload, localization, analytics, Apple Sign-In, recurring groups, and explicit legacy-account linking remain outside the MVP unless the feature catalogue and associated stories are deliberately amended.
