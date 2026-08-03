import assert from "node:assert/strict";
import test from "node:test";

import {
  scanTrackedFiles,
  secretContentRules,
  secretFilenameRule,
} from "../scripts/scan-secrets.mjs";

test("secret filename rules reject tracked credentials but allow templates", () => {
  assert.equal(secretFilenameRule(".env"), "environment file");
  assert.equal(secretFilenameRule("config/.env.production"), "environment file");
  assert.equal(secretFilenameRule("keys/server.pem"), "credential file");
  assert.equal(secretFilenameRule("keys/id_ed25519"), "private key file");
  assert.equal(secretFilenameRule("config/credentials.json"), "credential file");
  assert.equal(secretFilenameRule(".env.example"), null);
  assert.equal(secretFilenameRule("docs/environment.md"), null);
});

test("secret content rules detect supported credential families", () => {
  const fixtures = [
    ["private key", ["-----BEGIN", " PRIVATE KEY-----"].join("")],
    ["GitHub token", ["ghp_", "a".repeat(40)].join("")],
    ["OpenAI API key", ["sk-proj-", "b".repeat(24)].join("")],
    ["AWS access key", ["AKIA", "C".repeat(16)].join("")],
    ["Stripe live secret", ["sk_", "live_", "d".repeat(24)].join("")],
    ["Slack token", ["xoxb-", "e".repeat(24)].join("")],
  ];

  for (const [expectedRule, fixture] of fixtures) {
    assert.deepEqual(secretContentRules(fixture), [expectedRule]);
  }
  assert.deepEqual(secretContentRules("FORGE has no credentials here."), []);
});

test("the current tracked source contains no detected credentials", () => {
  assert.deepEqual(scanTrackedFiles(), []);
});
