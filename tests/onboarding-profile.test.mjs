import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageUrl = new URL("../app/page.tsx", import.meta.url);
const appRouteUrl = new URL("../app/app/page.tsx", import.meta.url);
const stateRouteUrl = new URL("../app/api/state/route.ts", import.meta.url);

test("onboarding sends all three explicit setup choices into secure app entry", async () => {
  const page = await readFile(pageUrl, "utf8");

  assert.match(page, /onEnter\("new", \{\s*trainingGoal: goal,\s*trainingDays: days,\s*coachStyle,/s);
  assert.match(page, /params\.set\("goal", setup\.trainingGoal\)/);
  assert.match(page, /params\.set\("days", setup\.trainingDays\)/);
  assert.match(page, /params\.set\("coach", setup\.coachStyle\)/);
  assert.match(page, /"Save my setup"/);
  assert.match(page, /window\.history\.replaceState\(window\.history\.state, "", "\/app"\)/);
});

test("secure app entry accepts only known onboarding values", async () => {
  const route = await readFile(appRouteUrl, "utf8");

  assert.match(route, /\["Strength", "Muscle", "Hybrid"\]/);
  assert.match(route, /\["3 days", "4 days", "5 days"\]/);
  assert.match(route, /\["Protective", "Balanced", "Relentless"\]/);
  assert.match(route, /initialSetup=\{initialSetup\}/);
});

test("account state validates setup choices and profile exposes editable controls", async () => {
  const [page, route] = await Promise.all([
    readFile(pageUrl, "utf8"),
    readFile(stateRouteUrl, "utf8"),
  ]);

  assert.match(route, /value\.trainingGoal === undefined \|\| \["Strength", "Muscle", "Hybrid"\]/);
  assert.match(route, /value\.trainingDays === undefined \|\| \["3 days", "4 days", "5 days"\]/);
  assert.match(route, /value\.coachStyle === undefined \|\| \["Protective", "Balanced", "Relentless"\]/);
  assert.match(route, /value\.trainingSlot === undefined \|\| \(/);
  assert.match(route, /Number\.isInteger\(value\.trainingSlot\)/);
  assert.match(page, /<p className="eyebrow">Training setup<\/p>/);
  assert.match(page, /<dt>Guidance<\/dt><dd>\{setup\.coachStyle\}<\/dd>/);
  assert.match(page, /style: setup\.coachStyle/);
});
