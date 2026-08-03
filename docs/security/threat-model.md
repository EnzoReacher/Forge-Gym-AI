# FORGE account foundation threat model

Status: active design baseline for the first authenticated release.

FORGE is not described as unhackable. The objective is to prevent, limit,
detect, investigate, and recover from attacks while keeping the product simple
enough to operate safely.

## Scope

This revision covers:

- ChatGPT sign-in for the protected `/app` route.
- Account creation from a platform-authenticated identity.
- Per-user training, meal, hydration, workout, and profile state in D1.
- The future role and plan fields stored on the server.

It does not authorize an admin dashboard, billing, public APIs, uploads, coach
access, or sharing between athletes.

## Sensitive assets

- Account identity and email.
- Training history and workout state.
- Meal, hydration, and profile preferences.
- Server-owned role, status, and plan assignments.
- Database integrity and availability.

FORGE must collect only the data required for the current workflow. Passwords,
payment credentials, authentication tokens, and health records that the current
product does not need must not be collected.

## Trust boundaries

1. The browser is untrusted. Client state, hidden controls, URLs, and submitted
   JSON may be modified by the user or an attacker.
2. Sites dispatch authenticates the ChatGPT user and forwards identity headers.
   Application code must not accept identity from request bodies or query
   parameters.
3. API routes are the authorization boundary. Every state read and write must
   derive its owner from the authenticated server identity.
4. D1 is the durable source of truth for signed-in account data. Browser storage
   is not authoritative for an authenticated user.

## Primary threats and controls

| Threat | Current control | Required verification |
| --- | --- | --- |
| Anonymous access to account data | Protected page and API check the server-authenticated user | Missing identity returns `401` or redirects to sign-in |
| One user reading or overwriting another user | Every state query is scoped by the authenticated account ID; no client-supplied owner ID is accepted | Automated source-boundary test plus future two-account integration test |
| Personalized HTML reused across sessions | Protected documents are marked private and non-cacheable for browsers, shared caches, and the CDN; validators are removed | Built-worker tests verify both authenticated and signed-out `/app` responses |
| Self-promotion to admin or paid plans | Role, status, and plan are server-owned and absent from writable profile state | No athlete endpoint may update these columns |
| Malformed or oversized state | Key allowlist, payload size cap, type/range/length validation | Invalid keys and payloads return `400`; oversized payloads return `413` |
| Password theft through a fake FORGE form | FORGE does not render password or email credential fields; dispatch owns sign-in | UI regression test ensures no password input exists |
| Stored script injection | React escapes rendered strings; server limits all user-controlled string lengths | Never render stored HTML without a dedicated sanitizer |
| Accidental overwrite during an outage | Failed account loads block use and cannot write fallback data | Simulate failed reads before public release |
| Sensitive error leakage | API responses are generic and do not expose stack traces, SQL, secrets, or internal errors | Review every new API response |
| Browser injection and framing | Per-response nonce CSP, denied framing, restrictive permissions, no-referrer policy, and MIME sniffing protection | Built-worker response test checks every script nonce and security header |
| Mutation abuse | Exact-origin checks, JSON-only mutations, validation, and durable per-account write limits | Request-boundary and rate-limit tests |
| Excessive privilege in future admin tools | Admin remains out of scope until MFA, audit logs, monitoring, and explicit authorization exist | Admin release gate |
| Dependency or CI supply-chain compromise | Locked dependencies, automated updates, least-privilege CI, and pinned GitHub Actions | CI and dependency review remain required |

## Residual risks

- Sign-in security depends partly on the identity provider and the user’s
  ChatGPT account security.
- The current account data model is a validated state store designed for the
  prototype. High-volume analytics and cross-device conflict resolution need a
  later relational model and versioning strategy.
- Managed encrypted backups, a production-backup restore drill, hosted alert
  delivery, and independent penetration testing remain required before public
  scale. The checked-in synthetic restore rehearsal covers migration and
  owner-isolation regressions only.
- Two-account isolation must be tested against the deployed runtime before
  opening the app beyond the current owner-only access policy.
- The production dependency audit is currently clear. Development tooling still
  has inherited findings documented in the dated dependency review and must run
  without production secrets until compatible upstream fixes are available.

## Release gates

Before widening access:

1. Test sign-in, sign-out, expired sessions, and account suspension.
2. Prove with two accounts that neither can read, modify, enumerate, or delete
   the other account’s records.
3. Add monitored authentication and API failure signals without logging
   sensitive payloads.
4. Define D1 backup, restoration, rollback, and retention procedures.
5. Publish the user-facing privacy notice and final retention details.
6. Complete an independent security review appropriate to the data collected.

Any high- or critical-severity finding blocks a public release.
