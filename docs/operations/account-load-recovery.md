# Account-load recovery

FORGE must not leave an athlete behind an endless loading screen when an
account-state or record request stalls.

## Recovery contract

- Every initial account-state and durable-record read has a six-second timeout.
- A temporary network or service failure receives one automatic retry.
- Session and access failures are never retried automatically.
- Two failed transient attempts show the existing safe account error instead
  of loading forever.
- **Try again** reloads only the failed account resources. It does not restart
  the full page, discard the temporary per-tab queue, or overwrite a newer
  pending edit.
- Returning online also retries a failed record load or resumes pending writes.

These deterministic checks do not replace the deployed weak-network and
interrupted-session release gate. That gate remains open until the production
browser matrix is completed and recorded.

When an API response includes the server-generated `X-Request-Id`, FORGE keeps
that UUID with the bounded account issue and shows it only on the related error
surface. The reference contains no identity, URL, request body, or saved value;
it lets support correlate a user-visible failure with the fixed-shape
operational event. Network failures without a server response never invent a
reference.
