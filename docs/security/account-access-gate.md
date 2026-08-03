# Shared account-access gate

State and durable-record APIs use one server-owned account gate before reading
or changing athlete data.

The gate:

- accepts only the identity forwarded by the platform-managed sign-in layer;
- normalizes the verified email before account lookup;
- creates a missing athlete account idempotently;
- keeps role, status, and plan values in the database rather than trusting the
  browser;
- denies every non-active account before any owner-scoped data operation; and
- synchronizes a changed verified display name without changing authorization.

Routes translate the gate's bounded `401` and `403` results into their existing
safe response shape. Database faults continue into the fixed-shape operational
error path and never expose internal details to the athlete.

Centralizing this rule reduces authorization drift before support, admin, and
subscription capabilities are introduced. It does not replace the deployed
two-account and suspended-account verification gates.
