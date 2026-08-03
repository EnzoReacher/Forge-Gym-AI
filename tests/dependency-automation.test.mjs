import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dependabotUrl = new URL("../.github/dependabot.yml", import.meta.url);

test("dependency automation covers npm and GitHub Actions", async () => {
  const config = await readFile(dependabotUrl, "utf8");

  assert.match(config, /^version: 2$/m);
  assert.match(config, /package-ecosystem: npm/);
  assert.match(config, /package-ecosystem: github-actions/);
  assert.equal((config.match(/target-branch: main/g) ?? []).length, 2);
  assert.equal((config.match(/interval: weekly/g) ?? []).length, 2);
  assert.equal((config.match(/timezone: Etc\/UTC/g) ?? []).length, 2);
});

test("compatible npm updates are grouped while majors remain explicit", async () => {
  const config = await readFile(dependabotUrl, "utf8");

  assert.match(config, /compatible-npm-updates:/);
  assert.match(config, /update-types:\n\s+- minor\n\s+- patch/);
  assert.doesNotMatch(config, /update-types:[\s\S]*?- major/);
  assert.match(config, /open-pull-requests-limit: 5/);
});
