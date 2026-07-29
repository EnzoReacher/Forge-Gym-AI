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
  assert.match(page, /Planning preview/);
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
