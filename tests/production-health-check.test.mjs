import assert from "node:assert/strict";
import test from "node:test";

import { runProductionHealthCheck } from "../scripts/production-health-check.mjs";

const healthy = {
  status: "ok",
  checks: {
    service: "ok",
    database: "ok",
  },
};

test("production probe sends the Sites token without exposing it in results", async () => {
  const secret = "test-secret-never-log";
  let receivedAuthorization = "";
  let receivedUrl = "";

  const result = await runProductionHealthCheck({
    baseUrl: "https://forge.example/path-that-must-not-be-used",
    token: secret,
    maxAttempts: 1,
    fetchImpl: async (url, options) => {
      receivedUrl = String(url);
      receivedAuthorization = options.headers["OAI-Sites-Authorization"];
      return Response.json(healthy);
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.equal(receivedUrl, "https://forge.example/api/health");
  assert.equal(receivedAuthorization, `Bearer ${secret}`);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(secret));
});

test("production probe retries a degraded result once", async () => {
  let requests = 0;
  const result = await runProductionHealthCheck({
    baseUrl: "https://forge.example",
    token: "secret",
    maxAttempts: 2,
    retryDelayMs: 0,
    fetchImpl: async () => {
      requests += 1;
      return requests === 1
        ? Response.json(
            { status: "degraded", checks: { service: "ok", database: "degraded" } },
            { status: 503 },
          )
        : Response.json(healthy);
    },
  });

  assert.equal(requests, 2);
  assert.equal(result.ok, true);
  assert.equal(result.attempts, 2);
});

test("production probe rejects redirects, oversized bodies, and invalid URLs", async () => {
  const redirected = await runProductionHealthCheck({
    baseUrl: "https://forge.example",
    token: "secret",
    maxAttempts: 1,
    fetchImpl: async () =>
      new Response(null, { status: 302, headers: { location: "https://other.example" } }),
  });
  assert.equal(redirected.ok, false);

  const oversized = await runProductionHealthCheck({
    baseUrl: "https://forge.example",
    token: "secret",
    maxAttempts: 1,
    fetchImpl: async () =>
      new Response("x".repeat(10_001), {
        headers: { "content-type": "application/json" },
      }),
  });
  assert.equal(oversized.reason, "invalid_body");

  await assert.rejects(
    runProductionHealthCheck({
      baseUrl: "http://forge.example",
      token: "secret",
      maxAttempts: 1,
    }),
    /credential-free HTTPS/,
  );
});
