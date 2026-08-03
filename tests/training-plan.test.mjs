import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildStarterWeek } from "../app/training-plan.mjs";

const pageUrl = new URL("../app/page.tsx", import.meta.url);

test("starter weeks contain seven days and exactly the saved training rhythm", () => {
  for (const goal of ["Strength", "Muscle", "Hybrid"]) {
    for (const count of [3, 4, 5]) {
      const week = buildStarterWeek(goal, `${count} days`);
      assert.equal(week.length, 7);
      assert.equal(week.filter((day) => day.status !== "rest").length, count);
      assert.equal(week.filter((day) => day.status === "focus").length, 1);
      assert.equal(week.at(-1).day, "SUN");
      assert.equal(week.at(-1).status, "rest");
    }
  }
});

test("goal choices produce distinct starter sessions without invented dates", () => {
  const strength = buildStarterWeek("Strength", "3 days");
  const muscle = buildStarterWeek("Muscle", "3 days");
  const hybrid = buildStarterWeek("Hybrid", "3 days");

  assert.equal(strength[0].title, "Upper strength");
  assert.equal(muscle[0].title, "Upper hypertrophy");
  assert.equal(hybrid[0].title, "Full-body strength");
  assert.deepEqual(strength.map((day) => day.day), ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]);
  assert.ok(strength.every((day) => !("date" in day)));
});

test("unknown setup values fall back to a bounded three-day strength week", () => {
  const week = buildStarterWeek("Unknown", "99 days");
  assert.equal(week.filter((day) => day.status !== "rest").length, 3);
  assert.equal(week[0].title, "Upper strength");
});

test("training screen uses the saved profile choices and states the plan boundary", async () => {
  const page = await readFile(pageUrl, "utf8");

  assert.match(page, /buildStarterWeek\(setup\.trainingGoal, setup\.trainingDays\)/);
  assert.match(page, /Built from the choices saved in your profile/);
  assert.doesNotMatch(page, /illustrative until weekly planning is connected/);
  assert.doesNotMatch(page, /const weekPlan = \[/);
});
