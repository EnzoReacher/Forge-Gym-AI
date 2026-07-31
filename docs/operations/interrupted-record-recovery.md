# Interrupted record recovery

Status: client recovery behavior is implemented and covered by deterministic
fault tests. Deployed browser verification remains a wider-access gate.

## Recovery contract

FORGE applies a workout, meal, hydration change, correction, or deletion to the
screen immediately, then places the exact mutation in a temporary per-tab
queue. The queue:

- accepts only validated workout, meal, hydration, and deletion shapes;
- keeps at most the newest 40 mutations in memory and session storage;
- restores pending visible results only after the server record list loads;
- sends one mutation at a time in creation order;
- aborts a network attempt after 12 seconds so a hung request cannot own the
  queue forever;
- stops on the first failed attempt without dropping that mutation or later
  work;
- retries when connectivity returns or the athlete selects **Retry now**;
- removes only the exact mutation object that the server confirmed, preserving
  a newer edit with the same key if it arrived while the older request was in
  flight; and
- removes temporary session storage after every queued mutation is confirmed.

Server writes remain owner-scoped and idempotent by stable record ID. Retrying
a request whose response was interrupted must not create a duplicate record.

## Deterministic fault coverage

Automated checks prove:

1. malformed and oversized queues are reduced to the newest 40 safe entries;
2. create then correction restores the latest visible record in order;
3. a partial failure preserves the failed mutation and all later work;
4. an older in-flight success cannot erase a newer same-record edit;
5. a hung attempt is aborted and releases the queue for a later retry; and
6. a completely successful drain removes the temporary queue.

These checks protect the state machine but do not claim that a deployed browser,
platform session, or real network has passed. Run `FAIL-01` and `FAIL-02` in the
deployed authentication and isolation matrix before widening access.
