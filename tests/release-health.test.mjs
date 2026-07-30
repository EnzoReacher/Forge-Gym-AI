import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("release health checks the runtime and D1 without exposing internals", async () => {
  const route = await source("app/api/health/route.ts");

  assert.match(route, /getDb\(\)/);
  assert.match(route, /sql`select 1 as ok`/);
  assert.match(route, /release_health/);
  assert.match(route, /healthResponse\("degraded", 503\)/);
  assert.match(route, /Cache-Control/);
  assert.match(route, /X-Content-Type-Options/);
  assert.doesNotMatch(route, /identity|email|stack|exception|message:/i);
});

test("rollback decisions protect data before preserving a new release", async () => {
  const runbook = await source("docs/operations/release-health-rollback.md");
  const roadmap = await source("docs/product/roadmap.md");

  assert.match(runbook, /Do not automatically reverse database migrations/);
  assert.match(runbook, /cross, corrupt, or silently lose account-owned data/);
  assert.match(runbook, /last verified immutable application version/);
  assert.match(roadmap, /\[x\] Add release health checks and a documented rollback decision/);
});
