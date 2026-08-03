import assert from "node:assert/strict";
import test from "node:test";
import {
  loadAccountResource,
  withAccountLoadTimeout,
} from "../app/account-load-recovery.mjs";

test("a hung account read is aborted instead of leaving the app loading forever", async () => {
  let observedAbort = false;

  await assert.rejects(
    withAccountLoadTimeout(
      (signal) => new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => {
          observedAbort = true;
          reject(new DOMException("Timed out", "AbortError"));
        }, { once: true });
      }),
      5,
    ),
    (error) => error instanceof DOMException && error.name === "AbortError",
  );
  assert.equal(observedAbort, true);
});

test("a transient account read is retried once and can recover", async () => {
  const attempts = [];
  const result = await loadAccountResource(
    async (_signal, attempt) => {
      attempts.push(attempt);
      if (attempt === 1) throw new Error("unavailable");
      return { ok: true };
    },
    { timeoutMs: 20 },
  );

  assert.deepEqual(attempts, [1, 2]);
  assert.deepEqual(result, { ok: true });
});

test("session and access failures are never retried", async () => {
  let attempts = 0;

  await assert.rejects(
    loadAccountResource(
      async () => {
        attempts += 1;
        throw new Error("session");
      },
      {
        timeoutMs: 20,
        shouldRetry: (error) => error.message === "unavailable",
      },
    ),
    /session/,
  );
  assert.equal(attempts, 1);
});

test("transient retries stay bounded when the service remains unavailable", async () => {
  let attempts = 0;

  await assert.rejects(
    loadAccountResource(
      async () => {
        attempts += 1;
        throw new Error("unavailable");
      },
      { timeoutMs: 20 },
    ),
    /unavailable/,
  );
  assert.equal(attempts, 2);
});
