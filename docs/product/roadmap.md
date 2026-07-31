# FORGE delivery roadmap

Status: active. Update this file when a milestone ships or its order changes.

The roadmap follows one rule: make FORGE useful, understandable, secure, and
recoverable before making it larger.

## Now — private account foundation

- [x] Protect `/app` with platform-managed identity.
- [x] Store account-owned state in D1.
- [x] Keep role, status, and plan assignments server-owned.
- [x] Validate state keys, shapes, lengths, ranges, and payload size.
- [x] Add a two-account service test that uses the same keys and proves the
  stored values remain separate.
- [x] Emit fixed-shape operational events without identity, request bodies, or
  saved state.
- [x] Route entry through the protected `/app` page so an existing ChatGPT
  session is reused and anonymous visitors are redirected by the server-owned
  sign-in gate without starting a redundant second sign-in.
- [x] Distinguish expired sessions, restricted accounts, and temporary service
  failures so the user gets a safe, specific recovery action instead of a
  generic dead end.
- [x] Avoid rewriting unchanged account state on every app open; only
  user-initiated changes enter the sync and retry path.
- [x] Reuse the platform-authenticated identity on `/app` without starting a
  redundant second ChatGPT sign-in, and provide a bounded session-reset path
  when identity forwarding is unavailable.
- [x] Add built-worker authentication contract tests for missing identity,
  returning accounts, and post-onboarding entry.
- [ ] Run the deployed two-account isolation matrix before widening access.
- [ ] Verify sign-in, sign-out, expired sessions, suspension, and recovery
  against the deployed runtime.

## P0 design reset — FORGE / Raw Steel

This is a product milestone, not optional polish. The current interface has
accumulated multiple visual layers and too many familiar AI-dashboard
conventions. FORGE must become recognizable as FORGE rather than as a dark
template.

The reset must:

- Preserve the black, blood-red, burnt-bronze, and cold-steel identity.
- Express the warrior idea through discipline and focus, not fantasy labels on
  every surface.
- Remove obsolete style layers instead of adding another override section.
- Reduce cards by at least half where grouping and dividers communicate the
  structure more clearly.
- Use one radius scale, one restrained elevation system, and a small gradient
  budget.
- Reserve red for the current action, a meaningful state, or a warning.
- Use sparks only for landing atmosphere, cinematic entry, and earned moments
  such as completing a session.
- Replace repetitive words such as protocol, tactical, arsenal, system, and
  mission with direct product language when they do not add meaning.
- Keep body copy in normal sentence case. Uppercase is reserved for short
  labels and brand marks.
- Make real user data and the next useful action visually stronger than
  decoration.
- Meet readable type, contrast, reduced-motion, keyboard, and 44px touch-target
  requirements.

### UI acceptance gate

A redesigned screen does not ship until:

1. A beginner can identify the next action within five seconds.
2. Every visible number is real, clearly labelled sample data, or absent.
3. No section exists only to make the screen appear more advanced.
4. The mobile version works one-handed without horizontal scrolling.
5. Removing an effect would harm understanding or brand recognition; otherwise
   remove it.
6. The implementation replaces legacy CSS rather than stacking a new theme on
   top.

### Raw Steel delivery

- [x] Phase 1: replace the accumulated landing, login, onboarding, and
  cinematic-entry layers with one direct, restrained entry system.
- [x] Phase 2: apply the same rules to Today, Train, Fuel, Coach, and Progress.
- [x] Phase 3: complete keyboard, reduced-motion, mobile, and beginner
  comprehension checks across the whole athlete flow.

## Next — trustworthy core records

- [x] Model completed workouts, individual sets, meals, hydration changes, and
  progress as owner-scoped durable records.
- [x] Add optimistic record creation/deletion, idempotent retry, and automatic
  retry when the connection returns.
- [x] Keep unsynced record mutations in a bounded, temporary per-tab queue,
  replay them sequentially after reload or reconnection, restore their
  optimistic result only after the account record list loads, and remove the
  queue immediately after the server confirms every mutation.
- [x] Keep multi-table workout creation, correction, set replacement, audit,
  and deletion atomic so a partial database failure cannot split a workout
  from its sets or correction history.
- [x] Preserve older account state through an idempotent record migration.
- [x] Add account-record export and deliberate workout/meal deletion.
- [x] Add full owner-scoped correction for completed workouts, individual
  sets, meals, and hydration entries. Corrections keep the original record ID,
  recalculate derived workout metrics, record a correction timestamp, and emit
  a minimal audit event instead of deleting and recreating history.
- [x] Replace remaining demonstrative metrics with account-owned records or
  explicit, plainly labelled defaults and planning previews.
- [x] Remove invented starter-workout loads; new athletes choose their own
  comfortable load before FORGE records it.
- [ ] Complete deployed browser-level weak connection, partial failure, and
  interrupted-session recovery checks.

## Operations before wider access

- [x] Define privacy-safe production alert signals, thresholds, resolution
  conditions, and response actions for authentication failures, state and
  record API failures, release health, latency, and elevated error rates.
- [ ] Connect the alert policy to a hosted monitoring provider and verified
  primary and backup notification destinations.
- [ ] Establish automated encrypted backups and a protected retention policy.
- [x] Add a reproducible disposable restore rehearsal that applies every
  migration, verifies checksums and table counts, and tests two-owner
  isolation using synthetic data.
- [ ] Complete and record a restore drill from a managed production backup
  against an access-restricted disposable environment.
- [x] Add release health checks and a documented rollback decision.
- [x] Enforce exact-origin mutations, JSON request types, and durable
  per-account write limits for state and core records.
- [x] Apply nonce-based CSP and restrictive browser security headers.
- [x] Review and remediate production dependency exposure; document residual
  development-toolchain risk.
- [x] Define incident response, evidence handling, recovery, notification, and
  closure criteria.
- [x] Complete an internal data-minimization and privacy-control review.
- [ ] Publish a user-facing privacy notice and final retention details before
  wider access.
- [ ] Obtain an independent security review appropriate to the collected data.

## Later — only after the foundations pass

1. Protected Admin Control Center focused on health, support, safe account
   management, and audited actions.
2. Secure billing and honest Free, paid, and highest-tier entitlements.
3. Production AI coaching with safety boundaries, cost telemetry, and clear
   uncertainty.
4. Mobile delivery using the same product rules, data contracts, and APIs.

Admin, billing, and mobile must not force the athlete interface to become more
complex today.

## Deferred hosting review

- Re-evaluate Netlify only after the core records, Raw Steel, and security gates
  are stable.
- The current Netlify experiment deployed repository source files and must not
  be treated as a production release.
- Any future migration needs a written compatibility plan for identity, D1,
  API routes, secrets, rollback, and runtime monitoring before deployment.
