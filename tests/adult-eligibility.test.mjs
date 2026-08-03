import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("adult-only beta access is enforced before athlete features open", async () => {
  const page = await read("../app/page.tsx");

  assert.match(page, /accountBacked && !profile\.adultConfirmedAt/);
  assert.match(page, /I am 18 or older/);
  assert.match(page, /I am under 18/);
  assert.match(page, /new Date\(\)\.toISOString\(\)/);
  assert.match(page, /\/signout-with-chatgpt\?return_to=%2Fprivacy/);
});

test("adult confirmation minimizes data and is validated server-side", async () => {
  const [page, stateRoute, privacyReview] = await Promise.all([
    read("../app/page.tsx"),
    read("../app/api/state/route.ts"),
    read("../docs/security/privacy-review.md"),
  ]);

  assert.doesNotMatch(page, /birthDate|dateOfBirth|type="date"/);
  assert.match(stateRoute, /adultConfirmedAt/);
  assert.match(stateRoute, /\\d\{4\}.*\\d\{3\}Z/);
  assert.match(stateRoute, /Date\.parse\(value\.adultConfirmedAt\)/);
  assert.match(privacyReview, /does not collect a birth date/i);
});
