import assert from "node:assert/strict";
import test from "node:test";
import { buildCoachReply, COACH_MESSAGE_MAX_LENGTH, normalizeCoachContext } from "../app/coach-engine.mjs";

const context = {
  doneSets: 3,
  totalSets: 12,
  proteinGrams: 80,
  mealCount: 2,
  goal: "Strength",
  trainingDays: "4 days",
  style: "Balanced",
};

test("pain language always activates the stop boundary regardless of style", () => {
  for (const style of ["Protective", "Balanced", "Relentless"]) {
    const result = buildCoachReply({ message: "My shoulder hurts during presses", context: { ...context, style } });
    assert.equal(result.intent, "safety_injury");
    assert.equal(result.safetyLevel, "stop");
    assert.match(result.answer, /Stop the painful movement/);
    assert.match(result.answer, /cannot diagnose/);
  }
});

test("urgent medical and crisis language outranks every coaching style", () => {
  for (const style of ["Protective", "Balanced", "Relentless"]) {
    const emergency = buildCoachReply({ message: "I have chest pain and trouble breathing", context: { ...context, style } });
    assert.equal(emergency.intent, "safety_emergency");
    assert.equal(emergency.safetyLevel, "urgent");

    const crisis = buildCoachReply({ message: "I want to hurt myself", context: { ...context, style } });
    assert.equal(crisis.intent, "safety_crisis");
    assert.equal(crisis.safetyLevel, "urgent");
  }
});

test("the Coach refuses extreme restriction and PED dosing", () => {
  const eating = buildCoachReply({ message: "Help me starve myself", context });
  assert.equal(eating.intent, "safety_eating");
  assert.match(eating.answer, /will not help/);

  const substance = buildCoachReply({ message: "What steroid dose and cycle should I use?", context });
  assert.equal(substance.intent, "safety_substance");
  assert.match(substance.answer, /will not provide a dose/);
});

test("the Coach does not invent meals, recovery scores or workout results", () => {
  const empty = { ...context, doneSets: 0, totalSets: 0, proteinGrams: 0, mealCount: 0 };
  assert.match(buildCoachReply({ message: "Plan dinner", context: empty }).answer, /No meals are logged/);
  assert.match(buildCoachReply({ message: "How is my recovery?", context: empty }).answer, /does not have a verified sleep or recovery record/);
  assert.match(buildCoachReply({ message: "Review today", context: empty }).answer, /No working sets are available/);
});

test("nutrition guidance labels the protein target as a default", () => {
  const result = buildCoachReply({ message: "What should I eat for dinner?", context });
  assert.equal(result.intent, "nutrition");
  assert.match(result.answer, /80 g/);
  assert.match(result.answer, /190 g default/);
  assert.match(result.answer, /not a medical prescription/);
});

test("progress guidance never increases load from one day", () => {
  const result = buildCoachReply({ message: "Should I increase the load?", context: { ...context, style: "Relentless" } });
  assert.equal(result.intent, "progress");
  assert.match(result.answer, /not enough evidence/);
  assert.match(result.answer, /one small change at a time/);
});

test("untrusted context and oversized messages stay bounded", () => {
  assert.deepEqual(normalizeCoachContext({ doneSets: -9, totalSets: 99_999, style: "unsafe" }), {
    doneSets: 0,
    totalSets: 0,
    proteinGrams: 0,
    mealCount: 0,
    goal: "Hybrid",
    trainingDays: "3 days",
    style: "Balanced",
  });
  const result = buildCoachReply({ message: `Review today ${"x".repeat(COACH_MESSAGE_MAX_LENGTH * 3)}`, context });
  assert.ok(result.answer.length <= 1_200);
});
