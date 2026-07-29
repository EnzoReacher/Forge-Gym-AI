import assert from "node:assert/strict";
import test from "node:test";
import {
  loadAccountState,
  saveAccountState,
} from "../app/api/state/service.mjs";

class MemoryAccountStateStore {
  records = new Map();

  recordKey(ownerId, key) {
    return `${ownerId}\u0000${key}`;
  }

  async findForOwner(ownerId, key) {
    const valueJson = this.records.get(this.recordKey(ownerId, key));
    return valueJson === undefined ? null : { valueJson };
  }

  async upsertForOwner(ownerId, key, valueJson) {
    this.records.set(this.recordKey(ownerId, key), valueJson);
  }
}

test("two accounts can use the same state key without crossing data", async () => {
  const store = new MemoryAccountStateStore();

  await saveAccountState(store, "account-a", "forge-water", 1_750);
  await saveAccountState(store, "account-b", "forge-water", 3_000);

  assert.equal(
    await loadAccountState(store, "account-a", "forge-water"),
    1_750,
  );
  assert.equal(
    await loadAccountState(store, "account-b", "forge-water"),
    3_000,
  );
});

test("a client-shaped owner field cannot redirect a write", async () => {
  const store = new MemoryAccountStateStore();
  const untrustedValue = {
    userId: "account-b",
    displayName: "Athlete A",
    units: "Metric",
    notifications: true,
  };

  await saveAccountState(
    store,
    "account-a",
    "forge-profile",
    untrustedValue,
  );

  assert.deepEqual(
    await loadAccountState(store, "account-a", "forge-profile"),
    untrustedValue,
  );
  assert.equal(
    await loadAccountState(store, "account-b", "forge-profile"),
    null,
  );
});
