import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("core account APIs share one server-owned active-account gate", async () => {
  const [gate, stateRoute, recordsRoute] = await Promise.all([
    read("../app/api/account-access.ts"),
    read("../app/api/state/route.ts"),
    read("../app/api/records/route.ts"),
  ]);

  assert.match(gate, /getChatGPTUser\(\)/);
  assert.match(gate, /account\.status !== "active"/);
  assert.match(gate, /onConflictDoNothing\(\{ target: users\.email \}\)/);
  assert.match(gate, /identityName: identity\.fullName/);
  assert.match(gate, /return \{ account \}/);

  for (const route of [stateRoute, recordsRoute]) {
    assert.match(route, /import \{ getCurrentActiveAccount \} from "\.\.\/account-access"/);
    assert.match(route, /await getCurrentActiveAccount\(\)/);
    assert.match(route, /"problem" in auth/);
    assert.doesNotMatch(route, /async function currentAccount/);
    assert.doesNotMatch(route, /getChatGPTUser/);
  }
});

test("the shared gate exposes only safe authentication and access failures", async () => {
  const gate = await read("../app/api/account-access.ts");

  assert.match(gate, /status: 401/);
  assert.match(gate, /Authentication required\./);
  assert.match(gate, /Invalid authenticated identity\./);
  assert.match(gate, /status: 403/);
  assert.match(gate, /Account access is unavailable\./);
  assert.doesNotMatch(gate, /stack|exception|password|token/i);
});
