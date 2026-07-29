# FORGE — Product Constitution

This file is the permanent reminder for Hoàng, Codex, and every person who
designs or builds FORGE. Read it before making product, design, content, or
engineering decisions.

## Why FORGE exists

FORGE exists to help people improve their physical health and capability,
regardless of age, experience, confidence, or starting point.

Many people want to become stronger and healthier but feel overwhelmed,
confused, intimidated, or unsure where to begin. FORGE should turn that
confusion into one clear and realistic next action.

FORGE is a companion, not a replacement for effort. We provide structure,
guidance, encouragement, and useful feedback. The user still owns their
choices, consistency, effort, and outcome. We never promise transformation
without action, and we never shame someone for struggling or starting again.

## The product promise

FORGE must always be:

- Easy to use.
- Easy to access.
- Easy to see and read.
- Easy to understand.
- Honest about what it knows and what it cannot do.
- Useful for beginners without limiting experienced athletes.
- Supportive without becoming noisy, childish, or manipulative.

The Spartan and warrior identity should create courage and focus. It must never
make the interface aggressive, confusing, crowded, or difficult to approach.

## Non-negotiable design principles

1. **One clear next move**
   The user should immediately understand what matters now and what to tap next.

2. **The fewest reasonable steps**
   Logging a set, meal, drink, or check-in should be fast. Secondary controls
   stay out of the way until they are needed.

3. **Clarity before decoration**
   Visual effects, sparks, motion, copy, and statistics must earn their place.
   Remove anything that competes with the primary action.

4. **Real actions and real data**
   Never show a control that does nothing. Never present sample, estimated, or
   placeholder data as if it were the user's real progress.

5. **Accessible by default**
   Use readable type, strong contrast, generous touch targets, plain language,
   keyboard support, reduced-motion support, and layouts that work on small
   phones as well as desktop screens.

6. **Progress without punishment**
   Missed sessions and setbacks are information, not failure. Help the user
   restart with a smaller next action instead of guilt, fear, or fake urgency.

7. **Safety over ego**
   Do not encourage users to train through pain, ignore medical warning signs,
   or chase numbers at the cost of technique and recovery. FORGE supports
   decisions; it does not replace qualified medical care.

8. **Complexity must justify itself**
   A new feature is not automatically an improvement. Prefer improving the core
   journey before adding another dashboard, metric, tab, or setting.

9. **Recognizable product language, not template effects**
   FORGE must not look like a generic dark AI dashboard. Do not use cards,
   gradients, glow, uppercase labels, cinematic words, or decorative metrics by
   default. Build one coherent visual system, remove superseded CSS instead of
   stacking theme overrides, and reserve warrior language for moments where it
   strengthens meaning. The active visual-reset requirements live in
   `docs/product/roadmap.md`.

## Long-term foundations

FORGE will grow beyond the current web prototype. Every major technical
decision should keep the following future stages possible without making the
current experience harder to use.

### User accounts and management

- Move account-owned training, nutrition, recovery, and progress data from
  device-only storage to durable per-user storage when real authentication is
  introduced.
- Support clear roles such as athlete, coach, support, and administrator only
  when each role has a real product need.
- Give users control over their data, including understandable privacy choices,
  export, correction, and deletion.
- Treat health, body, nutrition, injury, and training information as sensitive.
  Use least-privilege access and never expose one user's data to another.
- Build management tools to solve support and safety problems, not to create
  surveillance or unnecessary control over users.

### Admin Control Center

FORGE must eventually have a separate, strongly protected administrator account
and control center. It is an operational product, not a hidden version of the
athlete interface.

The administrator must be able to:

- See whether the app is healthy: availability, response time, failed requests,
  background jobs, database health, storage, integrations, and current release.
- See recent errors, affected features, number of affected users, first and
  latest occurrence, severity, and whether the issue is resolved.
- Search and manage user accounts, account status, roles, plan access, support
  state, onboarding completion, and last successful activity.
- Identify users who are blocked by login, sync, payment, data, workout,
  nutrition, or device problems without guessing from vague reports.
- Review support reports with the technical context needed to reproduce and
  resolve the problem.
- Suspend, restore, or restrict an account when required for security, abuse,
  or support, with a reason and a reversible process.
- Manage app-wide configuration, feature flags, announcements, content, and
  controlled rollouts without editing production code for routine operations.
- See release history, health after deploy, rollback readiness, and which
  version each user is running.
- View aggregate product signals such as onboarding completion, active users,
  workout completion, retention, crashes, and failed core journeys.

Administrator power must have hard limits:

- Admins can never view passwords, authentication secrets, payment credentials,
  or other unrecoverable secrets.
- Access to sensitive health or personal data must be minimal, purpose-based,
  and visible in an audit log.
- Every important admin action must record who acted, what changed, when, why,
  and whether it was reversed.
- High-risk actions require explicit confirmation; destructive bulk actions
  require stronger protection.
- Use strong authentication, multi-factor authentication, short sessions, and
  least-privilege roles. Do not rely on a hidden URL as security.
- Support impersonation, if ever necessary, must be consent-aware, visibly
  marked, time-limited, read-only by default, and fully audited.
- The admin interface must never be shipped as a fake dashboard backed by
  placeholder health or user data.

Build the Admin Control Center only after real authentication, durable user
storage, authorization rules, audit logging, and application monitoring exist.
The first admin release should focus on system health, issue diagnosis, user
support, and safe account management before analytics or growth tooling.

### Security and resilience

Security is a release requirement, not a feature to add later. FORGE must use
defense in depth and assume that any single control can eventually fail. No one
may describe the app as "unhackable"; the honest objective is to prevent,
limit, detect, investigate, and recover from attacks as effectively as
practical.

The mandatory security baseline is:

- Model threats before building authentication, payments, health data, admin
  tools, uploads, integrations, sharing, or public APIs.
- Authenticate with proven standards and mature providers rather than custom
  cryptography or home-made session systems.
- Require multi-factor authentication for administrators and other privileged
  roles. Support stronger authentication for users when appropriate.
- Enforce authorization on the server for every protected action and object.
  A hidden button, route, client-side role, or guessed identifier is never an
  authorization boundary.
- Keep each user's records isolated. Test explicitly that one user cannot read,
  modify, enumerate, or delete another user's data.
- Use secure, short-lived sessions with rotation, revocation, protected cookies,
  sensible device controls, and rate limits for login and recovery flows.
- Encrypt traffic in transit and sensitive data at rest. Store secrets only in
  managed secret storage, rotate them, scope them narrowly, and never commit
  them to source code, client bundles, logs, screenshots, or analytics.
- Validate input, encode output, use safe database queries, restrict CORS, apply
  CSRF protection where needed, define a strong Content Security Policy, and
  safely validate uploads by type, size, content, and storage location.
- Minimize collected data and retention. Do not collect sensitive information
  merely because it may be useful later.
- Keep dependencies pinned, reviewed, updated, and automatically scanned.
  Remove unused packages, endpoints, permissions, and integrations.
- Never expose stack traces, internal identifiers, secrets, or personal data in
  user-facing errors.
- Separate administrator surfaces and privileges from ordinary user access.
  Protect dangerous actions with re-authentication and explicit confirmation.
- Maintain tamper-resistant security and admin audit logs without storing
  unnecessary sensitive payloads.

Security must protect stability as well:

- Use graceful failure, timeouts, quotas, retry limits, resource isolation, and
  abuse controls so one broken feature or hostile client cannot take down the
  entire app.
- Monitor authentication failures, suspicious access, privilege changes,
  unusual data access, elevated error rates, latency, and resource exhaustion.
- Maintain a tested incident-response process for containment, credential
  rotation, user notification, recovery, and post-incident review.
- Keep encrypted backups, verify restoration regularly, and define recovery
  objectives before important user data is stored.
- Use staged or limited rollouts for risky changes and keep a fast, tested
  rollback path.

Before public scale, FORGE must receive independent security review and
penetration testing appropriate to its risk. Critical and high-severity
findings block release. Security tests must run continuously for authentication,
authorization, user isolation, admin actions, and the most important data
flows.

### Plans, subscriptions, and sustainable access

FORGE may offer Free and paid subscription plans so the product can remain
reliable, secure, and continuously improved. Higher-priced plans should feel
more powerful because they add meaningful depth, personalization, automation,
capacity, and support—not because the lower plans are deliberately frustrating.

The plan structure must follow these rules:

- The Free plan must provide a complete, useful core loop: understand the next
  action, follow or record training, see basic progress, and receive essential
  safety guidance. It may have sensible limits on AI usage, history depth,
  advanced analysis, automation, integrations, and premium programs.
- Paid plans may unlock deeper personalization, adaptive programming, advanced
  progress and recovery insights, longer history, richer planning, additional
  integrations, higher AI and storage limits, collaboration features, and
  faster support.
- Each higher tier must have a small number of clearly stronger benefits that a
  user can understand before paying. Do not create confusing feature matrices
  or artificial differences merely to add another price.
- Never put account security, accessibility, essential safety warnings, privacy
  controls, data correction, export, or deletion behind a paid plan.
- Do not use shame, fear, fake scarcity, disguised advertisements, obstructive
  cancellation, surprise charges, or misleading trials to force an upgrade.
- Show the price, billing period, renewal behavior, trial terms, limits, and
  downgrade consequences in plain language before purchase.
- Cancellation must be easy. Preserve user data safely during a clearly stated
  grace period, and let a downgraded user understand what remains available.
- A user who reaches a limit should keep their completed records. Explain the
  limit calmly, offer the most relevant upgrade once, and always provide a
  useful next action.
- Test plans against real usage and willingness to pay. Do not decide names,
  prices, or limits from prestige, competitor imitation, or guesswork alone.

Subscriptions must be implemented only after real authentication, durable user
storage, and server-enforced authorization exist. Use a mature payment provider
and avoid storing payment credentials ourselves. Treat plan entitlements as
server-owned data, verify payment events, make billing updates idempotent, keep
an audit trail, and never trust a client-side plan label to grant access.

The intended progression is:

1. **Free:** a trustworthy foundation that can genuinely help someone begin.
2. **Paid:** stronger personalization, insights, planning, and higher useful
   limits for committed users.
3. **Highest tier:** the most capable coaching experience, automation,
   integrations, and support for users who need them.

Exact tier names, prices, and limits remain product decisions to validate later.
The permanent rule is simple: every plan must be honest and useful, and paying
more must create real user value rather than remove manufactured pain.

### Deployment and operations

- Keep one trusted source of truth for the product.
- Every release must be reproducible, validated, reversible, and traceable.
- Separate configuration and secrets from source code.
- Add monitoring, backups, error reporting, and rollback before the app handles
  important user data at scale.
- Prefer small, safe releases over large risky launches.
- A successful build is not enough; a release succeeds only when users can
  complete the core journey reliably.

### Mobile future

- Design mobile-first now, even while FORGE is delivered on the web.
- Avoid desktop-only interactions, hover dependencies, tiny controls, and
  layouts that require horizontal scrolling.
- Keep core training rules, data models, and APIs independent from presentation
  so a future mobile app can reuse them instead of rebuilding the product.
- Preserve fast startup, one-handed use, large touch targets, interrupted-session
  recovery, and graceful behavior on weak connections.
- Choose PWA, native, or cross-platform delivery later based on real user needs,
  not trend or prestige.

### Growth order

1. Make the core web journey genuinely useful and easy.
2. Add secure accounts and durable user data.
3. Add the minimum management, privacy, and operational tools required.
4. Add secure billing, server-owned plan entitlements, and a useful Free plan.
5. Strengthen deployment, monitoring, backup, and recovery.
6. Move to mobile with shared product logic and validated user demand.

Prepare for these stages, but do not build them early when they would add
complexity without helping today's user.

## Decision filter

Before shipping any change, answer:

1. Does this help the user take a useful physical-health action?
2. Is the primary action obvious within a few seconds?
3. Can this be completed with fewer decisions or taps?
4. Is every word, number, and control necessary and truthful?
5. Can a beginner, an older user, and a tired user understand it?
6. Does it remain readable, responsive, and smooth on a small phone?
7. Are we helping the user act, rather than trying to impress them?
8. Does it preserve user isolation, privacy, security, and reliable recovery?
9. If this is paid, does the upgrade add real value without weakening the
   honest and useful Free experience?

If the answer to any question is no, simplify the change before shipping it.

## North star

**The user opens FORGE, understands the next move, completes it with confidence,
and leaves knowing that progress is still theirs to build.**
