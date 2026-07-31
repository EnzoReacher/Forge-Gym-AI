export const AUDIT_RETENTION_DAYS = 90;
export const AUDIT_RETENTION_MS =
  AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1_000;

export function sqliteTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("A valid retention timestamp is required.");
  }
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export function auditRetentionCutoff(now = Date.now()) {
  if (!Number.isFinite(now)) {
    throw new Error("A valid retention clock is required.");
  }
  return sqliteTimestamp(now - AUDIT_RETENTION_MS);
}
