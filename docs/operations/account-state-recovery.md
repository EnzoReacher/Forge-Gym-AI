# Account-state recovery

Profile settings and live-workout state use a latest-value-wins sync path.
This prevents an older request from reporting a newer edit as saved or from
arriving after a newer request from the same tab.

## Runtime behavior

- Writes for each state key run one at a time.
- Rapid edits are coalesced so only the newest waiting value is sent next.
- Every write attempt has a 12-second timeout.
- A failed write pauses that key without discarding its newest value.
- Manual retry, a newer edit, or the browser returning online resumes the key.
- The newest unsynced value is kept in per-tab session storage and restored
  after a reload. It is removed only when the server confirms the same client
  revision and no newer edit exists.
- A late initial account read never replaces a restored or newly edited value.

## Verification

The deterministic account-state queue tests cover serialization, coalescing,
stale success, stale failure, retry, reload restoration, cleanup, and timeout
abort behavior. Browser-level weak-network and interrupted-session checks remain
a separate release gate and must be completed against the deployed runtime.
