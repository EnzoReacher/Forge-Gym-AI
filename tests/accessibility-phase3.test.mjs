import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("athlete flow exposes its navigation, tabs, accordions, dialogs, and live regions", async () => {
  const page = await source("app/page.tsx");
  const layout = await source("app/layout.tsx");

  assert.match(layout, /<html lang="en">/);
  assert.match(page, /aria-current=\{screen === item\.name \? "page" : undefined\}/);
  assert.match(page, /role="tablist"/);
  assert.match(page, /role="tab"/);
  assert.match(page, /aria-selected=\{view === item\}/);
  assert.match(page, /aria-expanded=\{open\}/);
  assert.match(page, /role="dialog" aria-modal="true"/);
  assert.match(page, /role="log" aria-live="polite"/);
  assert.match(page, /role="progressbar"/);
});

test("keyboard and motion safeguards are implemented as product behavior", async () => {
  const page = await source("app/page.tsx");
  const css = await source("app/workspace.css");

  assert.match(page, /function useModalA11y/);
  assert.match(page, /event\.key === "Escape"/);
  assert.match(page, /event\.key !== "Tab"/);
  assert.match(page, /document\.body\.style\.overflow = "hidden"/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
  assert.match(css, /@media \(forced-colors:active\)/);
  assert.match(css, /@media \(max-width:380px\)/);
});

test("new accounts begin with honest records and beginner-readable effort language", async () => {
  const page = await source("app/page.tsx");

  assert.match(page, /const initialMeals: Meal\[\] = \[\]/);
  assert.match(page, /useStoredState\("forge-water", 0, accountBacked\)/);
  assert.match(page, /RIR means the clean reps you could still do/);
  assert.match(page, /stop with 1–2 clean reps left/);
  assert.doesNotMatch(page, /full ROM|Pain-free ROM|target RIR 1–2/);
});

test("interactive workspace controls keep a 44px mobile touch target", async () => {
  const css = await source("app/workspace.css");

  assert.match(css, /\.set-log-button\{min-height:44px/);
  assert.match(css, /\.coach-quick-prompts button\{min-height:44px/);
  assert.match(css, /\.range-switch button\{min-width:48px;min-height:44px/);
  assert.match(css, /\.meal-presets button\{min-height:44px/);
  assert.match(css, /\.preference>div button\{min-height:44px/);
});
