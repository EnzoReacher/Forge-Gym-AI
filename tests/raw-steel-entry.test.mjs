import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("entry flow uses direct product language instead of template theatre", async () => {
  const page = await source("app/page.tsx");

  assert.match(page, /Know what to do/);
  assert.match(page, /We stand beside you/);
  assert.match(page, /What are you training for/);
  assert.doesNotMatch(page, /THE FULL ARSENAL|PROTOCOL FORGED|THE SPARTAN PROTOCOL \/ 01/);
  assert.doesNotMatch(page, /24\/7|360°|COMMUNITY \/ 05|ATLAS|MAYA/);
});

test("entry CSS is one Raw Steel layer, not another numbered override", async () => {
  const css = await source("app/globals.css");

  assert.match(css, /FORGE Raw Steel — entry experience/);
  assert.doesNotMatch(css, /FORGE V2[1-6]/);
  assert.match(css, /prefers-reduced-motion/);
});
