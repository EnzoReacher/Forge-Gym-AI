import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { authorizeRetentionMaintenance } from
  "../app/api/maintenance/retention/service.mjs";
import { runRetentionMaintenance } from
  "../scripts/retention-maintenance.mjs";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const SECRET = "forge-retention-test-secret-1234567890";

test("retention maintenance fails closed without a strong configured secret", async () => {
  const request = new Request("https://forge.example/api/maintenance/retention", {
    headers: { "X-Forge-Maintenance-Key": SECRET },
  });

  assert.deepEqual(
    await authorizeRetentionMaintenance(request, undefined),
    {
      ok: false,
      status: 503,
      error: "Retention maintenance is not configured.",
    },
  );
  assert.equal(
    (await authorizeRetentionMaintenance(request, "too-short")).status,
    503,
  );
});

test("retention maintenance rejects a missing or incorrect operator secret", async () => {
  for (const presented of ["", `${SECRET}-wrong`]) {
    const request = new Request(
      "https://forge.example/api/maintenance/retention",
      {
        headers: presented
          ? { "X-Forge-Maintenance-Key": presented }
          : undefined,
      },
    );
    const result = await authorizeRetentionMaintenance(request, SECRET);
    assert.equal(result.ok, false);
    assert.equal(result.status, 401);
    assert.equal(result.error, "Maintenance authorization failed.");
  }
});

test("retention maintenance accepts only the exact configured operator secret", async () => {
  const request = new Request("https://forge.example/api/maintenance/retention", {
    headers: { "X-Forge-Maintenance-Key": SECRET },
  });
  assert.deepEqual(
    await authorizeRetentionMaintenance(request, SECRET),
    { ok: true },
  );
});

test("operator client sends protected headers and validates the safe response", async () => {
  let receivedUrl = "";
  let receivedOptions;
  const result = await runRetentionMaintenance({
    baseUrl: "https://forge.example/",
    maintenanceSecret: SECRET,
    sitesToken: "sites-test-token",
    fetchImpl: async (url, options) => {
      receivedUrl = String(url);
      receivedOptions = options;
      return Response.json({
        ok: true,
        retention: "applied",
        cutoff: "2026-05-02 12:30:45",
      });
    },
  });

  assert.equal(
    receivedUrl,
    "https://forge.example/api/maintenance/retention",
  );
  assert.equal(receivedOptions.method, "POST");
  assert.equal(receivedOptions.redirect, "error");
  assert.equal(
    receivedOptions.headers["X-Forge-Maintenance-Key"],
    SECRET,
  );
  assert.equal(
    receivedOptions.headers["OAI-Sites-Authorization"],
    "Bearer sites-test-token",
  );
  assert.deepEqual(result, { cutoff: "2026-05-02 12:30:45" });
});

test("retention endpoint deletes only expired audit markers after authorization", async () => {
  const route = await read("../app/api/maintenance/retention/route.ts");

  assert.match(route, /authorizeRetentionMaintenance/);
  assert.match(route, /FORGE_MAINTENANCE_SECRET/);
  assert.match(route, /delete\(auditEvents\)/);
  assert.match(route, /lt\(auditEvents\.createdAt, cutoff\)/);
  assert.doesNotMatch(
    route,
    /delete\((users|workouts|workoutSets|meals|hydrationEntries|userData)\)/,
  );
  assert.match(route, /retention_maintenance/);
});

test("retention workflow remains dispatch-only until activation gates pass", async () => {
  const [workflow, runbook] = await Promise.all([
    read("../.github/workflows/retention-maintenance.yml"),
    read("../docs/operations/retention-maintenance.md"),
  ]);

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\bschedule:/);
  assert.doesNotMatch(workflow, /\bcron:/);
  assert.match(workflow, /FORGE_MAINTENANCE_SECRET/);
  assert.match(runbook, /intentionally inactive/i);
  assert.match(runbook, /Do not add a `schedule` trigger/i);
});
