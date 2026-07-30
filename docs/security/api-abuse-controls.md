# API request and abuse controls

Status: enforced for account-owned mutation routes.

FORGE treats authentication, object ownership, input validation, request
provenance, and write limits as separate controls. None of them replaces the
others.

## Mutation request rules

- `PUT /api/state`, `POST /api/records`, and `PATCH /api/records` require an
  exact same-origin `Origin` header and `Content-Type: application/json`.
- `DELETE /api/records` requires the same exact-origin check.
- Cross-origin responses do not receive permissive CORS headers.
- Existing body-size and schema validation remains mandatory after these
  request checks.
- Every database query and mutation remains scoped to the authenticated owner.

These checks reduce browser-based cross-site request abuse. They do not replace
the platform identity gate or server-side authorization.

## Durable account write limits

Limits use a five-minute fixed window stored in D1 so separate Worker
instances share the same counter.

| Account action | Five-minute limit |
| --- | ---: |
| State updates | 120 |
| New durable records | 180 |
| Record corrections and deletions combined | 60 |

A rejected request returns `429`, `Retry-After`, and non-sensitive limit and
remaining-count headers. Operational telemetry records only the route event,
status, duration, severity, signal, and generated request ID. It does not log
the account, request body, record ID, state key, or saved value.

Normal use should remain far below these ceilings. Limits are a safety brake
for accidental loops and account-level abuse, not a substitute for provider
edge DDoS protection or identity-provider login controls.

## Review triggers

Review a limit only when measured legitimate use reaches it or the control
fails to contain abuse. Do not quietly raise a limit merely to hide a client
retry defect.
