# FORGE production alert policy

Status: alert definitions complete; hosted alert delivery still requires a
monitoring destination.

The repository now includes a privacy-safe, manual production health workflow.
It remains intentionally unscheduled until its protected Sites credential and
both notification destinations pass the activation exercise documented in
`hosted-health-activation.md`.

FORGE emits fixed-shape operational events for account state, durable records,
and release health. Events contain only the source, event name, outcome, HTTP
status, duration, severity, signal, and a generated request ID. They never
accept identity, URLs, request bodies, response bodies, or saved account data.

## Event signals

| Signal | Meaning | Per-request severity |
| --- | --- | --- |
| `none` | Successful request below the latency threshold | `info` |
| `auth_failure` | Protected request returned `401` or `403` | `notice` |
| `client_rejection` | Other rejected `4xx` request | `notice` |
| `latency` | Request took at least 1.5 seconds | `warning` or `error` |
| `service_failure` | Runtime, D1, or handler returned `5xx` | `error` |

A single notice is evidence, not automatically an incident. Alerts use bounded
time windows so normal session expiry or one invalid input does not page an
operator.

## Alert thresholds

### Release health

- **Critical:** `/api/health` returns `503` twice consecutively within two
  minutes.
- **Resolve:** three consecutive successful checks and the protected account
  read succeeds.
- **Action:** apply the release-health rollback runbook immediately.

### Authentication and account access

- **Warning:** at least 10 `auth_failure` events within five minutes.
- **Critical:** at least 50 within five minutes, or five times the trailing
  hourly baseline when the baseline is available.
- **Investigate:** distinguish expired sessions, suspended accounts, deployment
  regression, and hostile traffic before changing access rules.
- **Never include:** user email, name, token, cookie, IP address, or request
  payload in the alert body.

### State and durable-record APIs

- **Warning:** three `5xx` failures within five minutes for the same event.
- **Critical:** at least 10 `5xx` failures or a five-minute error rate of 5%,
  whichever occurs first.
- **Critical immediately:** any verified cross-account access, silent record
  loss, partial workout corruption, or unauthorized correction/deletion.
- **Resolve:** error rate remains below 1% for 15 minutes and the affected
  protected journey succeeds.

### Latency

- **Warning:** five-minute p95 latency exceeds 1.5 seconds for 10 minutes.
- **Critical:** five-minute p95 exceeds 3 seconds for five minutes, or health
  checks time out.
- **Resolve:** p95 remains below 1.5 seconds for 15 minutes.

### Elevated overall errors

- **Warning:** combined API `5xx` rate reaches 2% over five minutes with at
  least 20 requests.
- **Critical:** combined API `5xx` rate reaches 5% over five minutes, or a core
  user journey is consistently blocked.
- Low traffic never suppresses the consecutive health-failure or verified
  data-safety rules above.

## Alert contents

Every alert should contain only:

- severity and signal;
- affected event name;
- threshold and observation window;
- first and latest occurrence time;
- request count, failure count, error rate, and latency percentile where
  relevant;
- generated request IDs needed for investigation;
- current release number and the relevant runbook.

Alerts must not contain account records, nutrition or health details,
authentication material, raw exceptions, or database contents.

## Ownership and delivery

Before access is widened, connect these definitions to the hosted log and
metrics provider, choose one primary and one backup notification destination,
and record the on-call owner. Test warning, critical, resolved, and delivery
failure paths without using real user data.

An alert is operational only after delivery has been triggered and acknowledged
in a controlled test. Until then, the definitions and event fields are ready,
but active paging is not claimed.
