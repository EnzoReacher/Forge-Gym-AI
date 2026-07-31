import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPendingMutations,
  boundPendingMutationMap,
  boundedPendingMutations,
  drainPendingMutationQueue,
  pendingStorageKey,
  readPendingMutations,
  validPendingMutation,
  withMutationTimeout,
  writePendingMutations,
} from "../app/record-mutation-queue.mjs";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
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

const meal = {
  id: "meal-12345678",
  recordedAt: 1_800_000_000_000,
  time: "12:30",
  name: "Rice",
  detail: "",
  kcal: 500,
  protein: 30,
};

test("pending record queue keeps only bounded, structurally safe mutations", () => {
  const valid = {
    key: "create:meal:meal-12345678",
    method: "POST",
    type: "meal",
    id: meal.id,
    record: meal,
    createdAt: 100,
  };
  assert.equal(validPendingMutation(valid), true);
  assert.equal(validPendingMutation({ ...valid, type: "admin" }), false);
  assert.equal(validPendingMutation({ ...valid, record: { ...meal, id: "../other" } }), false);

  const storage = memoryStorage({
    [pendingStorageKey()]: JSON.stringify([valid, { method: "POST" }]),
  });
  assert.deepEqual(readPendingMutations(storage), [valid]);
});

test("pending mutations restore the last visible result in original order", () => {
  const corrected = { ...meal, name: "Chicken rice", kcal: 720 };
  const mutations = [
    {
      key: "create:meal:meal-12345678",
      method: "POST",
      type: "meal",
      id: meal.id,
      record: meal,
      createdAt: 100,
    },
    {
      key: "update:meal:meal-12345678",
      method: "PATCH",
      type: "meal",
      id: meal.id,
      record: corrected,
      createdAt: 200,
    },
  ];
  const restored = applyPendingMutations(
    { workouts: [], meals: [], hydration: [] },
    mutations,
  );
  assert.equal(restored.meals.length, 1);
  assert.equal(restored.meals[0].name, "Chicken rice");
  assert.equal(restored.meals[0].kcal, 720);
});

test("successful sync removes the temporary session queue", () => {
  const storage = memoryStorage();
  writePendingMutations(storage, [{
    key: "delete:meal:meal-12345678",
    method: "DELETE",
    type: "meal",
    id: meal.id,
    createdAt: 300,
  }]);
  assert.equal(readPendingMutations(storage).length, 1);
  writePendingMutations(storage, []);
  assert.equal(storage.getItem(pendingStorageKey()), null);
});

test("the in-memory queue keeps the newest forty safe mutations", () => {
  const mutations = Array.from({ length: 45 }, (_, index) => ({
    key: `create:meal:meal-${String(index).padStart(8, "0")}`,
    method: "POST",
    type: "meal",
    id: `meal-${String(index).padStart(8, "0")}`,
    record: {
      ...meal,
      id: `meal-${String(index).padStart(8, "0")}`,
      name: `Meal ${index}`,
    },
    createdAt: index,
  }));

  const bounded = boundedPendingMutations(mutations);
  assert.equal(bounded.length, 40);
  assert.equal(bounded[0].createdAt, 5);
  assert.equal(bounded.at(-1).createdAt, 44);

  const queue = new Map(mutations.map((mutation) => [mutation.key, mutation]));
  const originalReference = queue;
  assert.equal(boundPendingMutationMap(queue), originalReference);
  assert.equal(queue.size, 40);
  assert.equal([...queue.values()][0].createdAt, 5);
});

test("a partial failure keeps the failed mutation and every later mutation", async () => {
  const first = {
    key: "create:meal:meal-12345678",
    method: "POST",
    type: "meal",
    id: meal.id,
    record: meal,
    createdAt: 100,
  };
  const second = {
    key: "delete:meal:meal-87654321",
    method: "DELETE",
    type: "meal",
    id: "meal-87654321",
    createdAt: 200,
  };
  const third = {
    key: "delete:meal:meal-87654322",
    method: "DELETE",
    type: "meal",
    id: "meal-87654322",
    createdAt: 300,
  };
  const queue = new Map([
    [first.key, first],
    [second.key, second],
    [third.key, third],
  ]);
  let persisted = 0;

  const result = await drainPendingMutationQueue(
    queue,
    async (mutation) => {
      if (mutation === second) throw new Error("network");
    },
    () => {
      persisted += 1;
    },
  );

  assert.equal(result.ok, false);
  assert.deepEqual([...queue.values()], [second, third]);
  assert.equal(persisted, 1);
});

test("an in-flight success never deletes a newer replacement with the same key", async () => {
  const original = {
    key: "update:meal:meal-12345678",
    method: "PATCH",
    type: "meal",
    id: meal.id,
    record: { ...meal, name: "Original edit" },
    createdAt: 100,
  };
  const replacement = {
    ...original,
    record: { ...meal, name: "Newer edit" },
    createdAt: 200,
  };
  const queue = new Map([[original.key, original]]);
  const sent = [];

  const result = await drainPendingMutationQueue(
    queue,
    async (mutation) => {
      sent.push(mutation.record.name);
      if (mutation === original) queue.set(replacement.key, replacement);
    },
    () => {},
  );

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(sent, ["Original edit", "Newer edit"]);
  assert.equal(queue.size, 0);
});

test("a hung mutation is aborted so a later retry can take ownership", async () => {
  let observedAbort = false;

  await assert.rejects(
    withMutationTimeout(
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
