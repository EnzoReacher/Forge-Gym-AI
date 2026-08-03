import assert from "node:assert/strict";
import test from "node:test";

const authHeaders = {
  accept: "text/html",
  "oai-authenticated-user-email": "owner@example.test",
  "oai-authenticated-user-full-name": "Hoang%20Nguyen",
  "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
};

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("auth-flow", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const env = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};

const ctx = {
  waitUntil() {},
  passThroughOnException() {},
};

test("missing identity shows safe recovery instead of starting a second sign-in", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/app", {
      headers: { accept: "text/html" },
    }),
    env,
    ctx,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  assert.match(response.headers.get("cache-control") ?? "", /private/);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
  const html = await response.text();
  assert.match(html, /Your secure session is unavailable/);
  assert.match(html, /\/signout-with-chatgpt\?return_to=%2F/);
});

test("platform identity opens the protected app without an auth redirect", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/app", { headers: authHeaders }),
    env,
    ctx,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  assert.match(response.headers.get("cache-control") ?? "", /private/);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
  const html = await response.text();
  assert.doesNotMatch(html, /Your secure session is unavailable/);
  assert.match(html, /Hoang Nguyen/);
});

test("authenticated onboarding returns to the same protected account", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/app?welcome=new", { headers: authHeaders }),
    env,
    ctx,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  assert.match(response.headers.get("cache-control") ?? "", /private/);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
  assert.doesNotMatch(await response.text(), /Your secure session is unavailable/);
});
