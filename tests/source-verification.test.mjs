import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowUrl = new URL(
  "../.github/workflows/source-verification.yml",
  import.meta.url,
);
const packageUrl = new URL("../package.json", import.meta.url);

test("source verification runs for pull requests and the production branch", async () => {
  const workflow = await readFile(workflowUrl, "utf8");

  assert.match(workflow, /^\s*pull_request:/m);
  assert.match(workflow, /^\s*push:/m);
  assert.match(workflow, /^\s*- main$/m);
  assert.match(workflow, /cancel-in-progress: true/);
});

test("source verification has least privilege and pinned actions", async () => {
  const workflow = await readFile(workflowUrl, "utf8");
  const actionReferences = [...workflow.matchAll(/uses:\s*([^\s]+)/g)].map(
    (match) => match[1],
  );

  assert.match(workflow, /permissions:\n\s+contents: read/);
  assert.equal(actionReferences.length, 2);
  for (const reference of actionReferences) {
    assert.match(reference, /@[0-9a-f]{40}$/);
  }
  assert.match(workflow, /persist-credentials: false/);
});

test("source verification installs from the lock and checks the full source", async () => {
  const workflow = await readFile(workflowUrl, "utf8");

  assert.match(workflow, /run: npm ci/);
  assert.match(workflow, /run: npm run security:secrets/);
  assert.match(workflow, /run: npm run lint/);
  assert.match(workflow, /run: npm test/);
  assert.match(workflow, /run: npm audit --omit=dev --audit-level=high/);
  assert.match(workflow, /timeout-minutes: 15/);
});

test("secret verification is a checked-in deterministic command", async () => {
  const packageJson = JSON.parse(await readFile(packageUrl, "utf8"));

  assert.equal(
    packageJson.scripts["security:secrets"],
    "node scripts/scan-secrets.mjs",
  );
});
