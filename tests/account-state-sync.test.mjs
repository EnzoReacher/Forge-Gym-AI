import assert from "node:assert/strict";
import test from "node:test";
import {
  clearPendingAccountState,
  createLatestAccountStateSync,
  readPendingAccountState,
  withAccountStateSyncTimeout,
  writePendingAccountState,
} from "../app/account-state-sync.mjs";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function settle() {
  await new Promise((resolve) => setImmediate(resolve));
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

test("account state writes are serialized and coalesce to the latest value", async () => {
  const attempts = [];
  const releases = [];
  const synced = [];
  const queue = createLatestAccountStateSync({
    write: async (item) => {
      attempts.push(item);
      const release = deferred();
      releases.push(release);
      await release.promise;
    },
    onSynced: (item) => synced.push(item.revision),
  });

  queue.enqueue({ revision: 1, value: "first" });
  await settle();
  queue.enqueue({ revision: 2, value: "second" });
  queue.enqueue({ revision: 3, value: "latest" });

  assert.deepEqual(attempts.map((item) => item.value), ["first"]);
  releases[0].resolve();
  await settle();
  assert.deepEqual(attempts.map((item) => item.value), ["first", "latest"]);
  assert.deepEqual(synced, []);

  releases[1].resolve();
  await settle();
  assert.deepEqual(synced, [3]);
});

test("a failed stale write preserves the newer edit for explicit retry", async () => {
  const first = deferred();
  const attempts = [];
  const errors = [];
  const synced = [];
  const queue = createLatestAccountStateSync({
    write: async (item) => {
      attempts.push(item.value);
      if (item.revision === 1) await first.promise;
    },
    onSynced: (item) => synced.push(item.revision),
    onError: (error) => errors.push(error.message),
  });

  queue.enqueue({ revision: 1, value: "old" });
  await settle();
  queue.enqueue({ revision: 2, value: "new" });
  first.reject(new Error("offline"));
  await settle();

  assert.deepEqual(attempts, ["old"]);
  assert.deepEqual(errors, ["offline"]);

  queue.retry();
  await settle();
  assert.deepEqual(attempts, ["old", "new"]);
  assert.deepEqual(synced, [2]);
});

test("a failed latest value remains available until a retry succeeds", async () => {
  let shouldFail = true;
  const attempts = [];
  const synced = [];
  const queue = createLatestAccountStateSync({
    write: async (item) => {
      attempts.push(item.value);
      if (shouldFail) throw new Error("network");
    },
    onSynced: (item) => synced.push(item.revision),
  });

  queue.enqueue({ revision: 7, value: { workoutStarted: true } });
  await settle();
  shouldFail = false;
  queue.retry();
  await settle();

  assert.equal(attempts.length, 2);
  assert.deepEqual(attempts[1], { workoutStarted: true });
  assert.deepEqual(synced, [7]);
});

test("pending account state survives reload and clears only after confirmation", () => {
  const storage = memoryStorage();
  const pending = { revision: 4, value: { displayName: "Hoang" } };

  assert.equal(writePendingAccountState(storage, "forge-profile", pending), true);
  assert.deepEqual(readPendingAccountState(storage, "forge-profile"), pending);
  clearPendingAccountState(storage, "forge-profile");
  assert.equal(readPendingAccountState(storage, "forge-profile"), null);
  assert.equal(writePendingAccountState(storage, "../unsafe", pending), false);
});

test("a hung account-state write is aborted so recovery can continue", async () => {
  let observedAbort = false;

  await assert.rejects(
    withAccountStateSyncTimeout(
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
