import assert from "node:assert/strict";
import test from "node:test";
import { CoachRequestError, requestCoachReply } from "../app/coach-client.mjs";
import { COACH_POLICY_VERSION } from "../app/coach-engine.mjs";

const payload = {
  message: "Review today",
  context: {
    doneSets: 1,
    totalSets: 10,
    proteinGrams: 40,
    mealCount: 1,
    goal: "Hybrid",
    trainingDays: "3 days",
    style: "Balanced",
  },
};

test("the Coach client accepts only the fixed reply envelope", async () => {
  const reply = { answer: "Continue carefully.", intent: "today", source: "rules", safetyLevel: "standard", policyVersion: COACH_POLICY_VERSION };
  const result = await requestCoachReply(payload, {
    fetchImpl: async (_url, options) => {
      assert.equal(options.method, "POST");
      assert.equal(options.headers["Content-Type"], "application/json");
      return Response.json({ reply });
    },
  });
  assert.deepEqual(result, reply);
});

test("a malformed Coach response fails closed", async () => {
  await assert.rejects(
    requestCoachReply(payload, { fetchImpl: async () => Response.json({ reply: { answer: "missing contract" }, extra: true }) }),
    (error) => error instanceof CoachRequestError && error.code === "invalid_response",
  );
});

test("a hung Coach request is aborted by a bounded timeout", async () => {
  let aborted = false;
  await assert.rejects(
    requestCoachReply(payload, {
      timeoutMs: 5,
      fetchImpl: (_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => {
          aborted = true;
          reject(new DOMException("Aborted", "AbortError"));
        }, { once: true });
      }),
    }),
    (error) => error instanceof CoachRequestError && error.code === "timeout",
  );
  assert.equal(aborted, true);
});
