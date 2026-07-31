# FORGE account deletion

Status: self-service deletion is implemented for athlete accounts. The public
privacy notice and final operational retention schedule remain release gates.

## User contract

An authenticated athlete can export durable training records, then deliberately
delete the FORGE account from the account drawer. Deletion requires the exact
`DELETE FORGE` phrase and a same-origin JSON request. The browser redirects
through the platform sign-out path immediately after the server confirms the
transaction.

The deletion transaction permanently removes the athlete's workouts, workout
sets, meals, hydration entries, saved preferences, legacy state, and request
limit rows. It then removes the original email and display name, resets role and
plan, and marks the remaining account shell as deleted.

## Security and privacy boundaries

- Ownership comes only from the server-authenticated identity.
- The request accepts no user ID, email, record ID, role, plan, or deletion
  target.
- Every owner-scoped row deletion, the privacy-safe audit event, and account
  anonymization commit in one ordered database batch.
- Repeating the request does not recreate an account or disclose whether an
  earlier deletion completed.
- Admin, support, and coach accounts cannot use athlete self-service deletion.
- The audit marker contains no email, name, request body, saved value, or
  account target ID.

After a completed deletion, signing in again with the same platform identity
creates a new empty athlete account. Deleted training data is not restored.
