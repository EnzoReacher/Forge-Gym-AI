import assert from "node:assert/strict";
import test from "node:test";

import { applySecurityHeaders } from "../worker/security-headers.mjs";

test("HTML responses receive a nonce CSP and restrictive browser headers", async () => {
  const response = await applySecurityHeaders(
    new Request("https://forge.example/app"),
    new Response(
      '<!doctype html><script src="/app.js"></script><script>boot()</script>',
      { headers: { "content-type": "text/html; charset=utf-8", server: "test" } },
    ),
  );

  const csp = response.headers.get("content-security-policy") ?? "";
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];

  assert.ok(nonce);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000");
  assert.match(response.headers.get("permissions-policy") ?? "", /camera=\(\)/);
  assert.equal(response.headers.has("server"), false);
  assert.equal(
    response.headers.get("cache-control"),
    "private, no-store, max-age=0, must-revalidate",
  );
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
  assert.equal(response.headers.get("surrogate-control"), "no-store");
  assert.equal(response.headers.has("etag"), false);
  assert.equal(response.headers.has("last-modified"), false);

  const html = await response.text();
  assert.equal((html.match(new RegExp(`nonce="${nonce}"`, "g")) ?? []).length, 2);
});

test("public documents are not mislabeled as private account responses", async () => {
  const response = await applySecurityHeaders(
    new Request("https://forge.example/privacy"),
    new Response("<!doctype html><main>Privacy</main>", {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    }),
  );

  assert.equal(response.headers.get("cache-control"), "public, max-age=300");
  assert.equal(response.headers.has("cdn-cache-control"), false);
  assert.equal(response.headers.has("surrogate-control"), false);
});

test("non-document responses keep their body and receive static headers", async () => {
  const response = await applySecurityHeaders(
    new Request("https://forge.example/api/account"),
    new Response('{"ok":true}', {
      headers: { "content-type": "application/json" },
    }),
  );

  assert.equal(await response.text(), '{"ok":true}');
  assert.equal(response.headers.has("content-security-policy"), false);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("cross-origin-resource-policy"), "same-origin");
});
