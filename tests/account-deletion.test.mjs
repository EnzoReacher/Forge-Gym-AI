import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ACCOUNT_DELETE_CONFIRMATION,
  validAccountDeletion,
} from "../app/api/account/service.mjs";

test("account deletion accepts only one exact confirmation field", () => {
  assert.equal(ACCOUNT_DELETE_CONFIRMATION, "DELETE FORGE");
  assert.equal(validAccountDeletion({ confirmation: "DELETE FORGE" }), true);
  assert.equal(validAccountDeletion({ confirmation: "delete forge" }), false);
  assert.equal(validAccountDeletion({ confirmation: "DELETE FORGE", userId: "other" }), false);
  assert.equal(validAccountDeletion(null), false);
});

test("account deletion is authenticated, owner-derived, atomic, and complete", async () => {
  const route = await readFile(
    new URL("../app/api/account/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(route, /getChatGPTUser\(\)/);
  assert.match(route, /mutationRequestProblem\(request,[\s\S]*requiresJson: true/);
  assert.match(route, /where: eq\(users\.email, email\)/);
  assert.match(route, /if \(!account\) return json\(\{ deleted: true \}\)/);
  assert.match(route, /account\.role !== "athlete"/);
  assert.match(route, /await db\.batch\(\[/);
  for (const table of [
    "workoutSets",
    "workouts",
    "meals",
    "hydrationEntries",
    "userData",
    "requestLimits",
  ]) {
    assert.match(
      route,
      new RegExp(`db\\.delete\\(${table}\\)\\.where\\(eq\\(${table}\\.userId, account\\.id\\)\\)`),
    );
  }
  assert.match(route, /action: "account_self_deleted"/);
  assert.match(route, /actorUserId: null/);
  assert.match(route, /targetId: null/);
  assert.match(route, /db\.delete\(users\)\.where\(eq\(users\.id, account\.id\)\)/);
  assert.doesNotMatch(route, /deletedAccountEmail|deleted\+/);
  assert.doesNotMatch(route, /payload\.(userId|email|ownerId|targetId)/);
  assert.doesNotMatch(route, /values\([\s\S]*identity\.email/);
});

test("client requires typed confirmation and signs out after deletion", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /fetch\("\/api\/account"/);
  assert.match(page, /method: "DELETE"/);
  assert.match(page, /deleteConfirmation !== "DELETE FORGE"/);
  assert.match(page, /window\.location\.assign\("\/signout-with-chatgpt\?return_to=%2F"\)/);
  assert.match(page, /This cannot be undone/);
  assert.match(page, /non-identifying security event may be retained/);
});
