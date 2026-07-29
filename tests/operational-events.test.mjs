import assert from "node:assert/strict";
import test from "node:test";
import { observeApiRequest } from "../app/operational-events.mjs";

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
  assert.doesNotMatch(messages[0], /private@example\.com/);
  assert.doesNotMatch(messages[0], /sensitive workout state/);
});
