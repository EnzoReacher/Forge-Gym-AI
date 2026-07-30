import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("disposable restore drill reapplies every migration and proves isolation", async () => {
  const result = spawnSync(
    "python3",
    ["scripts/restore-drill.py", "--json"],
    {
      cwd: new URL("..", import.meta.url),
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "passed");
  assert.equal(report.scope, "synthetic-disposable-sqlite-recovery");
  assert.equal(report.schema_version, "0003_fuzzy_james_howlett");
  assert.equal(report.contains_production_data, false);
  assert.equal(report.temporary_artifacts_destroyed, true);
  assert.match(report.backup_sha256, /^[a-f0-9]{64}$/);
  assert.ok(Object.values(report.checks).every(Boolean));
  assert.equal(report.table_counts.users, 2);
  assert.equal(report.table_counts.workouts, 2);
});

test("recovery documentation keeps the production boundary explicit", async () => {
  const [runbook, drillRecord, roadmap] = await Promise.all([
    readFile(new URL("../docs/operations/backup-restore.md", import.meta.url), "utf8"),
    readFile(
      new URL("../docs/operations/restore-drill-2026-07-30.md", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../docs/product/roadmap.md", import.meta.url), "utf8"),
  ]);

  assert.match(runbook, /does not replace a restore from an encrypted managed backup/i);
  assert.match(drillRecord, /synthetic data only/i);
  assert.match(drillRecord, /Production backup restored\s*\|\s*No/i);
  assert.match(roadmap, /managed production backup/i);
  assert.doesNotMatch(drillRecord, /restore-a@example\.invalid/);
});
