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
  assert.match(route, /eq\(userData\.userId,\s*auth\.account\.id\)/);
  assert.match(route, /userId:\s*auth\.account\.id/);
  assert.doesNotMatch(route, /payload\.userId/);
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
