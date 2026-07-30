import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyOperationalEvent,
  observeApiRequest,
} from "../app/operational-events.mjs";

test("operational events produce stable alert signals without user context", () => {
  assert.deepEqual(
    classifyOperationalEvent("release_health", 503, 20),
    { severity: "error", signal: "service_failure" },
  );
  assert.deepEqual(
    classifyOperationalEvent("account_state_read", 401, 20),
    { severity: "notice", signal: "auth_failure" },
  );
  assert.deepEqual(
    classifyOperationalEvent("account_records_write", 200, 1_600),
    { severity: "warning", signal: "latency" },
  );
  assert.deepEqual(
    classifyOperationalEvent("account_records_write", 200, 3_100),
    { severity: "error", signal: "latency" },
  );
  assert.deepEqual(
    classifyOperationalEvent("account_records_read", 200, 20),
    { severity: "info", signal: "none" },
  );
});

test("operational telemetry excludes response bodies and user data", async () => {
  const messages = [];
  const originalInfo = console.info;

  console.info = (message) => messages.push(String(message));
  try {
    const response = await observeApiRequest(
      "account_state_read",
      async () =>
        Response.json({
          email: "private@example.com",
          value: "sensitive workout state",
        }),
      () => Response.json({ error: "failed" }, { status: 500 }),
    );

    assert.equal(response.status, 200);
    assert.ok(response.headers.get("x-request-id"));
  } finally {
    console.info = originalInfo;
  }

  assert.equal(messages.length, 1);
  assert.match(messages[0], /"event":"account_state_read"/);
  assert.match(messages[0], /"severity":"info"/);
  assert.match(messages[0], /"signal":"none"/);
  assert.doesNotMatch(messages[0], /private@example\.com/);
  assert.doesNotMatch(messages[0], /sensitive workout state/);
});

test("alert policy defines bounded thresholds and never claims delivery is active", async () => {
  const policy = await import("node:fs/promises")
    .then(({ readFile }) => readFile(
      new URL("../docs/operations/production-alerts.md", import.meta.url),
      "utf8",
    ));

  assert.match(policy, /twice consecutively within two\s+minutes/);
  assert.match(policy, /five-minute error rate of 5%/);
  assert.match(policy, /p95 latency exceeds 1\.5 seconds/);
  assert.match(policy, /active paging is not claimed/);
  assert.match(policy, /Never include:[\s\S]*user email/);
});
