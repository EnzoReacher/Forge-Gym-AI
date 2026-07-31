# FORGE retention maintenance

Status: protected endpoint and dispatch-only workflow are implemented. Automated
scheduling is intentionally inactive until credentials, monitoring, and backup
expiry are verified.

## What the maintenance job does

`POST /api/maintenance/retention` deletes only audit rows whose
`created_at` value is older than the deterministic 90-day cutoff. It does not
read or delete accounts, workouts, sets, meals, hydration, saved preferences,
or current audit rows.

The endpoint:

- fails closed when `FORGE_MAINTENANCE_SECRET` is absent, shorter than 32 bytes,
  or otherwise invalid;
- accepts the secret only through `X-Forge-Maintenance-Key`;
- compares the presented and configured secrets using equal-length SHA-256
  digests instead of an early-exit string comparison;
- returns no user identity, record content, audit content, or deleted-row
  details; and
- emits the fixed `retention_maintenance` operational event without request
  headers or bodies.

Authenticated account mutations continue to enforce the same cutoff as a
secondary safeguard.

## Activation checklist

Do not add a `schedule` trigger until every item below is complete.

1. Generate a high-entropy secret of at least 32 bytes outside the repository.
2. Store it as the secret production runtime variable
   `FORGE_MAINTENANCE_SECRET`.
3. Store the same value as the GitHub Actions repository secret
   `FORGE_MAINTENANCE_SECRET`.
4. Confirm `FORGE_PRODUCTION_URL` and `FORGE_SITES_BYPASS_TOKEN` are present in
   GitHub Actions without printing their values.
5. Insert synthetic audit markers on both sides of the 90-day boundary in an
   access-restricted test environment.
6. Run the **Retention maintenance** workflow manually.
7. Confirm the expired synthetic marker was removed and the recent marker
   remains. Do not inspect unrelated rows.
8. Confirm a missing or incorrect maintenance secret receives a generic failure
   and writes no database changes.
9. Connect failure and missed-run alerts to verified primary and backup
   notification destinations.
10. Record the test date, operator, release, cutoff, result, and remediation.

## Scheduling and rotation

After the activation checklist passes, run the job daily during a low-traffic
window. Keep the manual trigger for recovery. Alert when a run fails or when no
successful run is recorded within 26 hours.

Rotate the maintenance secret immediately after suspected disclosure and at
least every 90 days. Update the Sites runtime secret first, deploy the current
saved release so the new environment revision becomes active, update the
GitHub Actions secret, run the manual workflow, and revoke the old value.

Never place the secret in source, logs, issues, screenshots, workflow output, or
the maintenance response.
