const STORAGE_PREFIX = "forge-pending-account-state-v1:";
const MAX_PENDING_BYTES = 200_000;

export const ACCOUNT_STATE_SYNC_TIMEOUT_MS = 12_000;

function validRevision(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function validKey(value) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 120
    && /^[A-Za-z0-9_-]+$/.test(value);
}

function storageKey(key) {
  return `${STORAGE_PREFIX}${key}`;
}

export function readPendingAccountState(storage, key) {
  if (!validKey(key)) return null;
  try {
    const raw = storage.getItem(storageKey(key));
    if (!raw || raw.length > MAX_PENDING_BYTES) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !validRevision(parsed.revision)) {
      return null;
    }
    return { revision: parsed.revision, value: parsed.value };
  } catch {
    return null;
  }
}

export function writePendingAccountState(storage, key, item) {
  if (!validKey(key) || !item || !validRevision(item.revision)) return false;
  try {
    const serialized = JSON.stringify({
      revision: item.revision,
      value: item.value,
    });
    if (serialized.length > MAX_PENDING_BYTES) return false;
    storage.setItem(storageKey(key), serialized);
    return true;
  } catch {
    return false;
  }
}

export function clearPendingAccountState(storage, key) {
  if (!validKey(key)) return;
  try {
    storage.removeItem(storageKey(key));
  } catch {}
}

export async function withAccountStateSyncTimeout(
  run,
  timeoutMs = ACCOUNT_STATE_SYNC_TIMEOUT_MS,
) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("A positive account-state timeout is required.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

export function createLatestAccountStateSync({ write, onSynced, onError }) {
  if (typeof write !== "function") {
    throw new TypeError("An account-state writer is required.");
  }

  let pending = null;
  let inFlight = false;
  let paused = false;
  let disposed = false;

  const drain = async () => {
    if (disposed || paused || inFlight || !pending) return;

    const item = pending;
    pending = null;
    inFlight = true;

    try {
      await write(item);
    } catch (error) {
      inFlight = false;
      if (disposed) return;

      // Keep the failed value only when no newer edit is already waiting.
      if (!pending || pending.revision <= item.revision) pending = item;
      paused = true;
      onError?.(error, item);
      return;
    }

    inFlight = false;
    if (disposed) return;

    // A success is final only when nothing newer entered the queue while the
    // request was in flight. The hook performs one more revision comparison
    // against edits that may still be inside the debounce window.
    if (!pending) onSynced?.(item);
    void drain();
  };

  return {
    enqueue(item) {
      if (disposed || !item || !validRevision(item.revision)) return;
      if (!pending || item.revision >= pending.revision) pending = item;
      paused = false;
      void drain();
    },
    retry() {
      if (disposed) return;
      paused = false;
      void drain();
    },
    dispose() {
      disposed = true;
      pending = null;
    },
  };
}
