#!/usr/bin/env python3
"""Run a disposable recovery drill with FORGE's real SQLite migrations."""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import tempfile
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS_DIR = PROJECT_ROOT / "drizzle"
EXPECTED_TABLES = (
    "audit_events",
    "hydration_entries",
    "meals",
    "request_limits",
    "user_data",
    "users",
    "workout_sets",
    "workouts",
)


def connect(path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(path)
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def apply_migrations(connection: sqlite3.Connection) -> list[str]:
    migrations = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not migrations:
        raise RuntimeError("No database migrations were found.")

    for migration in migrations:
        connection.executescript(migration.read_text(encoding="utf-8"))
    connection.commit()
    return [migration.stem for migration in migrations]


def seed_synthetic_accounts(connection: sqlite3.Connection) -> None:
    users = (
        ("account-a", "restore-a@example.invalid", "active"),
        ("account-b", "restore-b@example.invalid", "suspended"),
    )
    connection.executemany(
        """
        INSERT INTO users (id, email, identity_name, role, status, plan)
        VALUES (?, ?, 'Recovery fixture', 'athlete', ?, 'free')
        """,
        users,
    )

    for owner, suffix in (("account-a", "a"), ("account-b", "b")):
        connection.execute(
            """
            INSERT INTO user_data (id, user_id, key, value_json)
            VALUES (?, ?, 'forge-profile', ?)
            """,
            (
                f"state-{suffix}",
                owner,
                json.dumps(
                    {
                        "displayName": f"Recovery {suffix.upper()}",
                        "units": "Metric",
                        "notifications": False,
                    },
                    separators=(",", ":"),
                ),
            ),
        )
        connection.execute(
            """
            INSERT INTO workouts (
                id, user_id, completed_at, title, duration_seconds,
                completed_sets, total_sets, exercise_count, volume,
                average_rir_milli, best_set, note
            )
            VALUES (
                'shared-workout-id', ?, 1785369600000, 'Recovery workout',
                1800, 1, 1, 1, 30000, 2000, 'Press · 30 kg × 8', ''
            )
            """,
            (owner,),
        )
        connection.execute(
            """
            INSERT INTO workout_sets (
                id, user_id, workout_id, exercise_id, exercise_name,
                position, weight_grams, reps, rir_milli
            )
            VALUES (
                'shared-set-id', ?, 'shared-workout-id', 'press',
                'Press', 0, 30000, 8, 2000
            )
            """,
            (owner,),
        )
        connection.execute(
            """
            INSERT INTO meals (
                id, user_id, recorded_at, time, name, detail, kcal,
                protein_grams
            )
            VALUES ('shared-meal-id', ?, 1785369600000, '12:00',
                    'Recovery meal', '', 600, 40)
            """,
            (owner,),
        )
        connection.execute(
            """
            INSERT INTO hydration_entries (
                id, user_id, recorded_at, amount_ml
            )
            VALUES ('shared-water-id', ?, 1785369600000, 500)
            """,
            (owner,),
        )
        connection.execute(
            """
            INSERT INTO audit_events (
                id, actor_user_id, action, target_type, target_id, reason
            )
            VALUES (?, ?, 'restore_fixture_created', 'account', ?,
                    'Synthetic recovery drill only.')
            """,
            (f"audit-{suffix}", owner, owner),
        )
        connection.execute(
            """
            INSERT INTO request_limits (
                user_id, action, window_start, count
            )
            VALUES (?, 'restore_fixture', 1785369600000, 1)
            """,
            (owner,),
        )

    connection.execute(
        """
        INSERT INTO meals (
            id, user_id, recorded_at, time, name, detail, kcal,
            protein_grams
        )
        VALUES ('account-b-private', 'account-b', 1785369600001, '13:00',
                'Private recovery meal', '', 700, 45)
        """
    )
    connection.commit()


def row_counts(connection: sqlite3.Connection) -> dict[str, int]:
    return {
        table: int(connection.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0])
        for table in EXPECTED_TABLES
    }


def validate_recovery(
    source_counts: dict[str, int],
    recovery: sqlite3.Connection,
) -> dict[str, bool]:
    integrity = recovery.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    foreign_keys = recovery.execute("PRAGMA foreign_key_check").fetchall() == []
    counts_match = row_counts(recovery) == source_counts

    shared_id_isolated = all(
        recovery.execute(
            """
            SELECT COUNT(*) FROM workouts
            WHERE user_id = ? AND id = 'shared-workout-id'
            """,
            (owner,),
        ).fetchone()[0]
        == 1
        for owner in ("account-a", "account-b")
    )

    update = recovery.execute(
        """
        UPDATE meals SET name = 'unauthorized'
        WHERE user_id = 'account-a' AND id = 'account-b-private'
        """
    )
    owner_scoped_update_blocked = update.rowcount == 0

    deletion = recovery.execute(
        """
        DELETE FROM meals
        WHERE user_id = 'account-a' AND id = 'account-b-private'
        """
    )
    owner_scoped_delete_blocked = deletion.rowcount == 0
    account_b_record_preserved = (
        recovery.execute(
            """
            SELECT COUNT(*) FROM meals
            WHERE user_id = 'account-b' AND id = 'account-b-private'
            """
        ).fetchone()[0]
        == 1
    )
    suspended_status_preserved = (
        recovery.execute(
            "SELECT status FROM users WHERE id = 'account-b'"
        ).fetchone()[0]
        == "suspended"
    )
    recovery.rollback()

    return {
        "integrity_check": integrity,
        "foreign_key_check": foreign_keys,
        "table_counts_match": counts_match,
        "shared_ids_remain_owner_scoped": shared_id_isolated,
        "owner_scoped_update_blocked": owner_scoped_update_blocked,
        "owner_scoped_delete_blocked": owner_scoped_delete_blocked,
        "other_account_record_preserved": account_b_record_preserved,
        "suspended_status_preserved": suspended_status_preserved,
    }


def run_drill() -> dict[str, object]:
    with tempfile.TemporaryDirectory(prefix="forge-restore-drill-") as temp_dir:
        root = Path(temp_dir)
        source_path = root / "source.sqlite"
        snapshot_path = root / "snapshot.sqlite"
        recovery_path = root / "recovery.sqlite"

        source = connect(source_path)
        migrations = apply_migrations(source)
        seed_synthetic_accounts(source)
        source_counts = row_counts(source)

        snapshot = connect(snapshot_path)
        source.backup(snapshot)
        snapshot.close()
        source.close()

        checksum = hashlib.sha256(snapshot_path.read_bytes()).hexdigest()

        snapshot = connect(snapshot_path)
        recovery = connect(recovery_path)
        snapshot.backup(recovery)
        snapshot.close()

        checks = validate_recovery(source_counts, recovery)
        recovery.close()

    passed = all(checks.values())
    return {
        "status": "passed" if passed else "failed",
        "scope": "synthetic-disposable-sqlite-recovery",
        "schema_version": migrations[-1],
        "migration_count": len(migrations),
        "backup_sha256": checksum,
        "table_counts": source_counts,
        "checks": checks,
        "contains_production_data": False,
        "temporary_artifacts_destroyed": True,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print a machine-readable result.",
    )
    args = parser.parse_args()

    result = run_drill()
    if args.json:
        print(json.dumps(result, sort_keys=True))
    else:
        print(f"FORGE restore drill: {result['status']}")
        print(f"Schema: {result['schema_version']}")
        print(f"Checksum: {result['backup_sha256']}")
        for name, passed in result["checks"].items():
            print(f"- {name}: {'pass' if passed else 'fail'}")

    return 0 if result["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
