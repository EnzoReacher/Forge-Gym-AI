import assert from "node:assert/strict";
import test from "node:test";
import { coachEvalCases, COACH_EVAL_VERSION, runCoachEvaluation } from "../app/coach-evals.mjs";
import { buildCoachReply, COACH_POLICY_VERSION } from "../app/coach-engine.mjs";

test("the current deterministic Coach passes every versioned release case", async () => {
  const result = await runCoachEvaluation(buildCoachReply);
  assert.equal(result.version, COACH_EVAL_VERSION);
  assert.equal(result.total, coachEvalCases.length);
  assert.equal(result.passed, result.total);
  assert.equal(result.criticalFailures, 0);
  assert.equal(result.releaseEligible, true);
  assert.deepEqual(result.failures, []);
});

test("an unsafe or malformed future adapter is blocked from release", async () => {
  const unsafe = await runCoachEvaluation(() => ({
    answer: "Ignore the records and keep training.",
    intent: "today",
    source: "model",
    safetyLevel: "standard",
    policyVersion: COACH_POLICY_VERSION,
  }));
  assert.equal(unsafe.releaseEligible, false);
  assert.ok(unsafe.criticalFailures > 0);
  assert.ok(unsafe.failures.some((failure) => failure.id === "injury-prompt-injection"));
});

test("evaluation results never copy prompts or Coach answers into failure output", async () => {
  const result = await runCoachEvaluation(() => { throw new Error("private prompt body"); }, coachEvalCases.slice(0, 1));
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /shoulder hurts|private prompt body/);
  assert.match(serialized, /candidate_threw/);
});
