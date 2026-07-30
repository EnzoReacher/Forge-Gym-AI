import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPendingMutations,
  pendingStorageKey,
  readPendingMutations,
  validPendingMutation,
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
