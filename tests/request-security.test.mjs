import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  consumeAccountWriteLimit,
  mutationRequestProblem,
  rateLimitHeaders,
  WRITE_WINDOW_MS,
} from "../app/api/request-security.mjs";
import { classifyOperationalEvent } from "../app/operational-events.mjs";

test("mutation requests require the exact application origin", () => {
  const sameOrigin = new Request("https://forge.example/api/state", {
    method: "PUT",
    headers: {
      origin: "https://forge.example",
      "content-type": "application/json",
    },
  });
  assert.equal(
    mutationRequestProblem(sameOrigin, { requiresJson: true }),
    null,
  );

  const crossOrigin = new Request("https://forge.example/api/state", {
    method: "PUT",
    headers: {
      origin: "https://attacker.example",
      "content-type": "application/json",
    },
  });
  assert.deepEqual(
    mutationRequestProblem(crossOrigin, { requiresJson: true }),
    { status: 403, error: "Cross-site request blocked." },
  );

  const missingOrigin = new Request("https://forge.example/api/state", {
    method: "PUT",
    headers: { "content-type": "application/json" },
  });
  assert.equal(mutationRequestProblem(missingOrigin)?.status, 403);
});

test("JSON mutations reject form and text payloads", () => {
  const request = new Request("https://forge.example/api/records", {
    method: "POST",
    headers: {
      origin: "https://forge.example",
      "content-type": "text/plain",
    },
  });
  assert.deepEqual(
    mutationRequestProblem(request, { requiresJson: true }),
    { status: 415, error: "JSON content type required." },
  );
});

test("rate-limit responses expose only retry metadata", () => {
  assert.equal(WRITE_WINDOW_MS, 300_000);
  assert.deepEqual(
    rateLimitHeaders({ retryAfter: 42, limit: 60, remaining: 0 }),
    {
      "Retry-After": "42",
      "X-RateLimit-Limit": "60",
      "X-RateLimit-Remaining": "0",
    },
  );
  assert.deepEqual(
    classifyOperationalEvent("account_records_write", 429, 20),
    { severity: "warning", signal: "rate_limit" },
  );
});

test("durable rate-limit results reject the first request above the ceiling", async () => {
  let cleanedUp = false;
  const table = {
    userId: "user_id",
    action: "action",
    windowStart: "window_start",
    count: "count",
  };
  const db = {
    insert() {
      return {
        values() {
          return {
            onConflictDoUpdate() {
              return {
                async returning() {
                  return [{ count: 61 }];
                },
              };
            },
          };
        },
      };
    },
    delete() {
      return {
        async where() {
          cleanedUp = true;
        },
      };
    },
  };

  const result = await consumeAccountWriteLimit({
    db,
    table,
    ownerId: "owner-a",
    action: "account_records_change",
    limit: 60,
    now: 310_000,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.remaining, 0);
  assert.equal(result.retryAfter, 290);
  assert.equal(cleanedUp, false);
});

test("routes use durable owner-scoped counters and document honest limits", async () => {
  const [schema, stateRoute, recordsRoute, policy] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/state/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/records/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../docs/security/api-abuse-controls.md", import.meta.url), "utf8"),
  ]);

  assert.match(schema, /request_limits/);
  assert.match(
    schema,
    /primaryKey\(\{\s*columns: \[table\.userId, table\.action, table\.windowStart\]/,
  );
  assert.match(stateRoute, /action: "account_state_write"/);
  assert.match(recordsRoute, /action: "account_records_create"/);
  assert.match(recordsRoute, /action: "account_records_change"/);
  assert.match(policy, /not a substitute for provider\s+edge DDoS protection/i);
  assert.doesNotMatch(policy, /unhackable/i);
});
