import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("protected app requires a server-authenticated ChatGPT user", async () => {
  const protectedPage = await source("app/app/page.tsx");

  assert.match(protectedPage, /requireChatGPTUser\("\/app"\)/);
  assert.match(protectedPage, /dynamic\s*=\s*"force-dynamic"/);
});

test("account state is always scoped to the authenticated owner", async () => {
  const route = await source("app/api/state/route.ts");

  assert.match(route, /getChatGPTUser\(\)/);
  assert.match(route, /loadAccountState\([\s\S]*auth\.account\.id/);
  assert.match(route, /saveAccountState\([\s\S]*auth\.account\.id/);
  assert.match(route, /eq\(userData\.userId,\s*ownerId\)/);
  assert.match(route, /userId:\s*ownerId/);
  assert.doesNotMatch(route, /payload\.userId/);
});

test("account API failures emit fixed-shape operational telemetry", async () => {
  const route = await source("app/api/state/route.ts");
  const telemetry = await source("app/operational-events.mjs");

  assert.match(route, /observeApiRequest/);
  assert.match(telemetry, /User identity, state values, request bodies/);
  assert.doesNotMatch(telemetry, /email|payload|request\.url/);
});

test("the primary sign-in screen never collects a password", async () => {
  const page = await source("app/page.tsx");

  assert.doesNotMatch(page, /type="password"/);
  assert.match(page, /CONTINUE WITH CHATGPT/);
});

test("durable account state uses the managed D1 binding", async () => {
  const manifest = JSON.parse(await source(".openai/hosting.json"));

  assert.equal(manifest.d1, "DB");
});
