import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildStarterSession, buildStarterWeek } from "../app/training-plan.mjs";

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

test("each training slot opens a bounded zero-load session that matches its focus", () => {
  const lower = buildStarterSession("Muscle", "4 days", 2);
  assert.equal(lower.slot, 2);
  assert.equal(lower.title, "Lower A");
  assert.match(lower.focus, /Quads/);
  assert.ok(lower.exercises.length >= 3 && lower.exercises.length <= 4);
  assert.ok(lower.exercises.every((exercise) => exercise.sets.length === 3));
  assert.ok(lower.exercises.every((exercise) => exercise.sets.every((set) => set.kg === 0 && set.done === false)));

  const conditioning = buildStarterSession("Hybrid", "4 days", 3);
  assert.equal(conditioning.title, "Conditioning");
  assert.ok(conditioning.exercises.some((exercise) => exercise.name === "Farmer carry"));
});

test("invalid or out-of-range session slots stay inside the saved weekly rhythm", () => {
  assert.equal(buildStarterSession("Strength", "3 days", -4).slot, 1);
  assert.equal(buildStarterSession("Strength", "3 days", 99).slot, 3);
  assert.equal(buildStarterSession("Unknown", "99 days", "bad").title, "Upper strength");
});

test("training screen uses the saved profile choices and states the plan boundary", async () => {
  const page = await readFile(pageUrl, "utf8");

  assert.match(page, /buildStarterWeek\(setup\.trainingGoal, setup\.trainingDays\)/);
  assert.match(page, /onSelectSession\(Number\(day\.slot\)\)/);
  assert.match(page, /title: plannedSession\.title/);
  assert.match(page, /Choose your loads before you begin/);
  assert.match(page, /Built from the choices saved in your profile/);
  assert.doesNotMatch(page, /illustrative until weekly planning is connected/);
  assert.doesNotMatch(page, /const weekPlan = \[/);
});
