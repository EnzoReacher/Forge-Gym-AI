# FORGE privacy review

Status: internal baseline. A user-facing privacy notice and final retention
schedule must be published before access is widened.

## Data used by the current product

- Platform-provided account identifier, email, and display name.
- Account status and server-owned role and plan.
- Workouts, individual sets, meals, hydration changes, progress, and profile
  preferences that the athlete chooses to save.
- Fixed-shape operational events and request IDs without identity, request
  bodies, or saved athlete state.

## Data not collected by FORGE

- Passwords or authentication tokens.
- Payment card or bank credentials.
- Precise location.
- Health records that are unnecessary for the current training workflow.

## User controls

Athletes can view and correct their records, export account-owned records, and
deliberately delete workouts and meals. Account deletion and formal retention
timelines require a published policy before wider access.

## Current safeguards and limits

The API derives ownership from server-authenticated identity, keeps role and
plan changes server-owned, validates state and record mutations, rate-limits
writes, and emits privacy-safe operational events. The service is currently
owner-only; this document is not a substitute for a public privacy notice,
legal review, managed backup policy, or independent security assessment.

The final notice must plainly state collection purpose, retention, deletion,
processors, contact method, and any region-specific user rights before
additional users are invited.
