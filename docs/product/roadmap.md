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

## Next — trustworthy core records

- Model workouts, sets, meals, hydration, and progress as durable records rather
  than a growing collection of JSON state keys.
- Add optimistic updates with conflict handling and interrupted-session
  recovery.
- Add user-facing correction, export, and deletion.
- Replace remaining demonstrative metrics with account-owned records.
- Test weak connections, retries, partial failure, and safe recovery.

## Operations before wider access

- Define production alerts for authentication failures, state API failures,
  latency, and elevated error rates.
- Establish automated encrypted backups and a protected retention policy.
- Complete and record a restore drill against a disposable environment.
- Add release health checks and a documented rollback decision.
- Review CSP, CORS, rate limits, privacy copy, dependency exposure, and incident
  response.
- Obtain an independent security review appropriate to the collected data.

## Later — only after the foundations pass

1. Protected Admin Control Center focused on health, support, safe account
   management, and audited actions.
2. Secure billing and honest Free, paid, and highest-tier entitlements.
3. Production AI coaching with safety boundaries, cost telemetry, and clear
   uncertainty.
4. Mobile delivery using the same product rules, data contracts, and APIs.

Admin, billing, and mobile must not force the athlete interface to become more
complex today.
