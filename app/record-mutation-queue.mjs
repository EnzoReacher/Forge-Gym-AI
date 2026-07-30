const STORAGE_KEY = "forge-pending-record-mutations-v1";
const METHODS = new Set(["POST", "PATCH", "DELETE"]);
const KINDS = new Set(["workout", "meal", "hydration"]);
const MAX_PENDING = 40;

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isRecordId(value) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{7,79}$/.test(value);
}

function isMutationKey(value) {
  return typeof value === "string"
    && value.length >= 8
    && value.length <= 180
    && /^[A-Za-z0-9][A-Za-z0-9:_-]+$/.test(value);
}

function safeRecord(type, value) {
  if (!isObject(value) || !isRecordId(value.id)) return false;
  if (type === "workout") {
    return typeof value.title === "string"
      && typeof value.completedAt === "number"
      && Array.isArray(value.sets);
  }
  if (type === "meal") {
    return typeof value.name === "string"
      && typeof value.recordedAt === "number"
      && typeof value.kcal === "number"
      && typeof value.protein === "number";
  }
  return typeof value.recordedAt === "number"
    && typeof value.amountMl === "number"
    && value.amountMl !== 0;
}

export function validPendingMutation(value) {
  if (!isObject(value)
    || !isMutationKey(value.key)
    || !METHODS.has(value.method)
    || !KINDS.has(value.type)
    || !isRecordId(value.id)
    || typeof value.createdAt !== "number"
    || !Number.isFinite(value.createdAt)) {
    return false;
  }
  return value.method === "DELETE"
    ? value.record === undefined
    : safeRecord(value.type, value.record) && value.record.id === value.id;
}

export function readPendingMutations(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(validPendingMutation).slice(-MAX_PENDING);
  } catch {
    return [];
  }
}

export function writePendingMutations(storage, mutations) {
  try {
    if (!mutations.length) {
      storage.removeItem(STORAGE_KEY);
      return;
    }
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify(mutations.filter(validPendingMutation).slice(-MAX_PENDING)),
    );
  } catch {}
}

function replaceRecord(records, record) {
  return [record, ...records.filter((item) => item.id !== record.id)];
}

export function applyPendingMutations(records, mutations) {
  const next = {
    workouts: [...records.workouts],
    meals: [...records.meals],
    hydration: [...records.hydration],
  };

  for (const mutation of mutations.filter(validPendingMutation)) {
    const target = mutation.type === "workout"
      ? "workouts"
      : mutation.type === "meal"
        ? "meals"
        : "hydration";
    if (mutation.method === "DELETE") {
      next[target] = next[target].filter((item) => item.id !== mutation.id);
    } else {
      next[target] = replaceRecord(next[target], mutation.record);
    }
  }

  next.workouts.sort((a, b) => b.completedAt - a.completedAt);
  next.meals.sort((a, b) => b.recordedAt - a.recordedAt);
  next.hydration.sort((a, b) => b.recordedAt - a.recordedAt);
  return next;
}

export function pendingStorageKey() {
  return STORAGE_KEY;
}
