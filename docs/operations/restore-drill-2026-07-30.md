# Restore rehearsal record — 2026-07-30

Status: passed.

This record covers a disposable recovery rehearsal using FORGE's complete
checked-in migration history and synthetic data only.

| Field | Result |
| --- | --- |
| Environment | Disposable local SQLite recovery databases |
| Production backup restored | No |
| Production data accessed | No |
| Schema version | `0003_fuzzy_james_howlett` |
| Migrations applied | 4 |
| Synthetic snapshot SHA-256 | `dfae698082ccc36d94ab916d5d7682970740e58bd54279996e19134db8962ac3` |
| Source and restored table counts | Matched |
| SQLite integrity check | Passed |
| Foreign-key check | Passed |
| Same record IDs across two owners | Remained isolated |
| Owner-scoped unauthorized update | Changed zero rows |
| Owner-scoped unauthorized deletion | Deleted zero rows |
| Suspended-account status | Preserved |
| Temporary artifacts | Destroyed automatically |

The rehearsal proves that the current migrations can construct, snapshot, and
restore a structurally valid database while preserving owner boundaries in the
recovery queries. It does not prove that managed production backups are
automated, encrypted, retained, or restorable within the current RPO/RTO.

## Remaining release gate

Connect an encrypted managed backup destination, automate the schedule, verify
retention and access controls, then repeat this matrix against a real managed
backup in an isolated recovery environment. Record the measured RPO and RTO.
