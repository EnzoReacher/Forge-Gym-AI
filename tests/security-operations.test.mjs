import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("incident response covers the critical containment lifecycle", async () => {
  const doc = await read("../docs/security/incident-response.md");
  for (const phrase of [
    "cross-account access",
    "Preserve evidence",
    "rotate every affected credential",
    "Notify",
    "Review",
  ]) {
    assert.match(doc, new RegExp(phrase, "i"));
  }
  assert.match(doc, /Never copy user request bodies/i);
});

test("privacy review records minimization and wider-access gates", async () => {
  const doc = await read("../docs/security/privacy-review.md");
  assert.match(doc, /Passwords or authentication tokens/i);
  assert.match(doc, /published at `\/privacy`/i);
  assert.match(doc, /Scheduled enforcement/i);
  assert.match(doc, /owner-only/i);
});

test("dependency review separates runtime from residual toolchain risk", async () => {
  const [doc, lockSource] = await Promise.all([
    read("../docs/security/dependency-review-2026-07-30.md"),
    read("../package-lock.json"),
  ]);
  const lock = JSON.parse(lockSource);
  assert.match(doc, /zero known[\s\S]*production-runtime findings/i);
  assert.match(doc, /full development audit still reports inherited findings/i);
  assert.equal(lock.packages["node_modules/postcss"].version, "8.5.25");
  assert.equal(lock.packages["node_modules/sharp"].version, "0.35.3");
});
