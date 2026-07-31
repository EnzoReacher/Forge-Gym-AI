# FORGE privacy review

Status: internal baseline. The user-facing notice is published at `/privacy`.
Final scheduled retention, managed backup expiry, and a dedicated external
privacy contact remain gates before access is widened.

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

Athletes can view and correct their records, export account-owned records,
deliberately delete individual records, and permanently delete an athlete
account through an exact-confirmation flow. The deletion transaction removes
the account row and every account-owned training row. Only a non-identifying
security marker may remain temporarily.

## Current safeguards and limits

The API derives ownership from server-authenticated identity, keeps role and
plan changes server-owned, validates state and record mutations, rate-limits
writes, and emits privacy-safe operational events. The service is currently
owner-only. Audit markers become eligible for deletion after 90 days and are
cleared during a later authenticated mutation. Scheduled enforcement, legal
review, managed backup expiry, and independent security assessment remain
release gates.

The public notice plainly states collection purpose, current retention,
deletion, infrastructure providers, present contact limits, and the adults-only
beta boundary. A dedicated external privacy contact and any region-specific
rights process must be completed before additional users are invited.
