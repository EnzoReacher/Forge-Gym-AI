export class CorruptSavedStateError extends Error {
  constructor() {
    super("Saved account state is not valid JSON.");
    this.name = "CorruptSavedStateError";
  }
}

/**
 * The service accepts the authenticated owner's server-side account ID as a
 * separate argument. It never reads an owner from client input.
 *
 * @param {{findForOwner(ownerId: string, key: string): Promise<{valueJson: string} | null>}} store
 * @param {string} ownerId
 * @param {string} key
 */
export async function loadAccountState(store, ownerId, key) {
  const row = await store.findForOwner(ownerId, key);
  if (!row) return null;

  try {
    return JSON.parse(row.valueJson);
  } catch {
    throw new CorruptSavedStateError();
  }
}

/**
 * @param {{upsertForOwner(ownerId: string, key: string, valueJson: string): Promise<void>}} store
 * @param {string} ownerId
 * @param {string} key
 * @param {unknown} value
 */
export async function saveAccountState(store, ownerId, key, value) {
  await store.upsertForOwner(ownerId, key, JSON.stringify(value));
}
