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
