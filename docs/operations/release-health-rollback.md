# FORGE release health and rollback runbook

Status: required for every production checkpoint.

The goal is to detect a broken release quickly, limit damage, and return to a
known-good application version without guessing. A successful build alone does
not prove that authentication, the runtime, or the database still work.

## Health signal

`GET /api/health` performs a minimal runtime and D1 query.

- `200` with `status: "ok"` means the application runtime answered and D1
  completed a read.
- `503` with `status: "degraded"` means the release must not be treated as
  healthy.
- The response never includes user data, database contents, credentials,
  internal identifiers, stack traces, or exception messages.
- Every check receives a request ID and emits the same fixed-shape operational
  event used by the account APIs.

This is a release health signal, not proof that every user journey works.

## Release verification

For every production checkpoint:

1. Require lint, the complete test suite, the production build, and artifact
   validation to pass before deployment.
2. Confirm the deployment reaches a terminal successful state.
3. Confirm `/api/health` returns `200` after deployment.
4. Verify sign-in and one safe account-data read before considering the release
   healthy.
5. For record or schema changes, verify one create, read, correction, and
   deletion path in the protected test account.
6. Watch authentication failures, API failures, latency, and elevated `5xx`
   events during the initial observation window.

## Rollback decision

Rollback the application release when any of these are true:

- The health endpoint returns `503` twice in a row after one bounded retry.
- Authenticated users cannot enter the protected app.
- Account reads or writes fail consistently after deployment.
- A release can expose, cross, corrupt, or silently lose account-owned data.
- Error rate or latency rises materially and the new release is the likely
  cause.
- A high- or critical-severity security regression is found.

Do not delay rollback merely to preserve a new feature. Protecting account data
and restoring the core journey are more important.

## Rollback procedure

1. Stop further release changes and identify the last verified healthy version.
2. Record the current release, first failure time, affected journey, request
   IDs, and the rollback owner.
3. Redeploy the last verified immutable application version.
4. Do not automatically reverse database migrations. First confirm that the
   older application is compatible with the current schema.
5. If schema compatibility is uncertain, restrict writes and follow the backup
   and restore runbook instead of experimenting on production.
6. Re-run the health, sign-in, account-read, and affected-journey checks.
7. Continue observation until health and error signals remain stable.
8. Preserve evidence and complete a short incident review before attempting a
   corrected release.

Rollback is complete only when users can finish the affected core journey
reliably. A green deployment status by itself is not enough.
