import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("athlete workspace distinguishes account records, defaults, and previews", async () => {
  const page = await source("app/page.tsx");

  assert.match(page, /Account data/);
  assert.match(page, /Your starter structure/);
  assert.match(page, /Built from the choices saved in your profile/);
  assert.match(page, /current default targets/);
  assert.match(page, /Rule-based prototype/);
  assert.doesNotMatch(page, /Readiness 92|Tactical channel open|SPARTAN \/ 01/);
  assert.doesNotMatch(page, /Protect right knee|Last top set: 30 kg/);
});

test("workspace uses one Raw Steel stylesheet instead of numbered theme layers", async () => {
  const globals = await source("app/globals.css");
  const workspace = await source("app/workspace.css");

  assert.match(workspace, /FORGE Raw Steel — athlete workspace/);
  assert.match(workspace, /prefers-reduced-motion/);
  assert.doesNotMatch(`${globals}\n${workspace}`, /FORGE V8|FORGE V16|FORGE V19|FORGE V20|FORGE V28|FORGE V30|FORGE V31|FORGE V32|FUEL V2|WARRIOR FORGE/);
});

test("Today only calls a saved workout complete when it was completed today", async () => {
  const page = await source("app/page.tsx");
  const layout = await source("app/layout.tsx");

  assert.match(page, /isSameLocalDay\(lastWorkout\.completedAt\)/);
  assert.match(page, /Welcome back, \{athleteName\}\./);
  assert.doesNotMatch(page, /Good afternoon/);
  assert.doesNotMatch(layout, /next\/font/);
});

test("new accounts are not given invented working weights", async () => {
  const page = await source("app/page.tsx");
  const initialPlan = page.slice(
    page.indexOf("const initialExercises"),
    page.indexOf("const exerciseLibrary"),
  );

  assert.match(initialPlan, /Choose a comfortable load/);
  assert.doesNotMatch(initialPlan, /kg: (?:[1-9]\d*)/);
  assert.match(page, /plannedLoad > 0 \? `\$\{plannedLoad\} kg` : "Set load"/);
  assert.match(page, /Starter plan · adjust every set to you/);
});
