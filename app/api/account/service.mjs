export const ACCOUNT_DELETE_CONFIRMATION = "DELETE FORGE";

export function validAccountDeletion(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    value.confirmation === ACCOUNT_DELETE_CONFIRMATION
  );
}

export function deletedAccountEmail(id) {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw new Error("A valid deletion identifier is required.");
  }
  return `deleted+${id.toLowerCase()}@forge.invalid`;
}
