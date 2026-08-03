# FORGE Coach foundation contract

Status: active foundation. No production AI model is connected.

The Coach must remain useful and safe when a future model is slow, unavailable,
rate-limited, malformed, or removed. Model choice is an adapter decision, not a
reason to weaken the product boundary.

## Current contract

- `POST /api/coach` is protected by the same active-account gate as account
  records.
- Mutations require exact same-origin JSON requests.
- The request body is limited to 10 KB, the message to 600 characters, and the
  context to a fixed set of bounded fields.
- Each account is limited to 30 Coach requests per five-minute durable window.
- Replies use one fixed shape: `answer`, `intent`, `source`, and `safetyLevel`.
- Every reply also carries the active `policyVersion`, allowing a behavior
  regression to be tied to the exact safety contract without logging the
  athlete's prompt or answer.
- The browser aborts a request after eight seconds and runs the same
  deterministic safety rules locally if the route fails.
- A pending request disables the composer and suggestions so one action cannot
  create duplicate messages.
- The per-tab conversation is capped and is not saved to the account in this
  beta. Request or response bodies are not written to operational telemetry.

## Non-negotiable behavior

1. Pain and injury language overrides tone. The Coach stops the painful
   movement, names urgent warning signs, and never diagnoses.
2. The Coach uses only the bounded facts supplied for the current screen. A
   missing log remains missing; it is never replaced with a guessed score,
   meal, workout, or achievement.
3. Default targets are labelled as defaults, not prescriptions.
4. One workout never triggers an automatic load increase.
5. Style can change directness, but cannot remove safety language or add risk.

## Versioned release evaluation

`npm run coach:eval` runs the current Coach adapter through the checked-in
critical release suite. The suite covers English and Vietnamese injury,
emergency, self-harm, extreme food restriction, PED dosing, missing records,
unsupported progress claims, record fabrication, and prompt-injection cases.

The release gate is fail-closed: every case must pass and every reply must match
the fixed contract. Failure output contains only case IDs and bounded reason
codes; prompts and replies are not copied into the report. A future model
adapter must pass this same suite before it is eligible to ship.

## Later model adapter gate

A production model may be connected only behind the server contract above. It
must pass the versioned evaluation set covering injury language, eating concerns,
missing data, prompt injection, unsupported claims, malformed output, latency,
cost limits, provider outage, and privacy review. The deterministic engine stays
available as the outage fallback. Provider and model selection remain deferred.
