# FORGE backup and restore runbook

Status: required operating procedure before widening access.

This runbook covers account-owned D1 data. Source code is protected separately
through version control and immutable Sites releases.

## Current recovery objectives

While FORGE remains owner-only:

- Recovery point objective (RPO): no more than 24 hours of account data.
- Recovery time objective (RTO): restore a verified service within four hours.

These are targets, not guarantees, until an automated backup schedule and a
successful restore drill are recorded.

Before public beta, backups must be automated, encrypted, access-controlled,
and retained independently from the active database.

## Backup requirements

Each backup must include:

- Database schema and migration history.
- Users, account state, and audit records.
- Creation time, source environment, release version, and schema version.
- A cryptographic checksum.
- Row counts for each included table.

Backups must never be committed to Git, copied into the web bundle, attached to
issues, or stored in a personal downloads folder. Access is limited to the
smallest operational role that can perform recovery.

## Daily backup procedure

1. Confirm the production release and schema version.
2. Create an encrypted managed snapshot or export through the approved hosting
   control plane.
3. Record the snapshot time, checksum, table counts, operator, and retention
   expiry in the backup register.
4. Verify that the artifact can be read by the recovery environment.
5. Never inspect or log row contents merely to prove that the backup exists.
6. Alert if the backup is late, incomplete, unencrypted, or cannot be verified.

## Restore drill

Run at least monthly before public beta and after a material schema change.

1. Create a disposable, access-restricted recovery database.
2. Restore the selected backup without touching production.
3. Apply only migrations that are newer than the restored schema.
4. Compare schema version, checksum, and table counts with the backup register.
5. Run authentication, two-account isolation, read, write, and suspended-account
   tests.
6. Confirm that account A cannot read, modify, enumerate, or delete account B.
7. Record actual restore duration, data loss window, failures, and remediation.
8. Destroy the disposable recovery database and its credentials after the drill.

The drill fails if validation is incomplete, isolation is not proven, sensitive
data appears in logs, or the measured recovery objectives are missed.

## Production recovery

1. Declare the incident and assign one recovery owner.
2. Stop or restrict writes if continued operation could corrupt more data.
3. Preserve relevant operational and audit events.
4. Identify the last known-good release, schema, and verified backup.
5. Restore into a separate recovery database first.
6. Run the complete restore validation matrix.
7. Switch production only after validation and a recorded decision.
8. Monitor sign-in, state reads/writes, error rate, and latency after recovery.
9. Notify affected users plainly when loss, exposure, or extended outage meets
   the incident-notification threshold.
10. Complete a post-incident review and update this runbook.

Never overwrite the only production database as the first recovery step.

## Backup register template

| Field | Value |
| --- | --- |
| Backup time | |
| Environment | |
| Release | |
| Schema version | |
| Checksum | |
| Table counts | |
| Operator | |
| Retention expiry | |
| Restore drill date | |
| Restore result | |
| Measured RPO / RTO | |
| Follow-up owner | |
