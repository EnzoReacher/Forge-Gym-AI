import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("protected app requires a server-authenticated ChatGPT user", async () => {
  const protectedPage = await source("app/app/page.tsx");

  assert.match(protectedPage, /const returnTo = params\.welcome === "new" \? "\/app\?welcome=new" : "\/app"/);
  assert.match(protectedPage, /requireChatGPTUser\(returnTo\)/);
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
  assert.match(page, /Continue with ChatGPT/);
  assert.match(page, /window\.location\.assign\(returnTo\)/);
  assert.doesNotMatch(page, /window\.location\.assign\(`\/signin-with-chatgpt/);
});

test("expired and restricted sessions have explicit recovery states", async () => {
  const page = await source("app/page.tsx");

  assert.match(page, /status === 401[\s\S]*return "session"/);
  assert.match(page, /status === 403[\s\S]*return "access"/);
  assert.match(page, /Your session has ended\. Sign in again to continue\./);
  assert.match(page, /This account cannot access FORGE right now\./);
  assert.match(page, /Your saved data has not been changed\./);
});

test("opening an account does not rewrite unchanged state", async () => {
  const page = await source("app/page.tsx");

  assert.match(page, /const \[dirty, setDirty\] = useState\(false\)/);
  assert.match(page, /if \(!ready \|\| !dirty \|\| \(accountBacked && loadError\)\) return/);
  assert.match(page, /const updateValue:[\s\S]*setDirty\(true\)/);
  assert.match(page, /setDirty\(false\)[\s\S]*setSyncError\(null\)/);
});

test("durable account state uses the managed D1 binding", async () => {
  const manifest = JSON.parse(await source(".openai/hosting.json"));

  assert.equal(manifest.d1, "DB");
});
