import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  publicWorkout,
  validDelete,
  validRecord,
  workoutRows,
} from "../app/api/records/service.mjs";

const workout = {
  id: "workout-12345678",
  completedAt: 1_800_000_000_000,
  title: "Upper strength",
  durationSeconds: 3600,
  completedSets: 1,
  totalSets: 3,
  exerciseCount: 1,
  volume: 300,
  averageRir: 2,
  bestSet: "Press · 30 kg × 10",
  note: "",
  sets: [{
    id: "set-12345678",
    exerciseId: "incline",
    exerciseName: "Incline press",
    position: 0,
    kg: 30,
    reps: 10,
    rir: 2,
  }],
};

test("durable record validation rejects unknown, oversized, and unsafe values", () => {
  assert.equal(validRecord("workout", workout), true);
  assert.equal(validRecord("meal", {
    id: "meal-12345678",
    recordedAt: Date.now(),
    time: "12:30",
    name: "Rice",
    detail: "",
    kcal: 500,
    protein: 30,
  }), true);
  assert.equal(validRecord("hydration", {
    id: "water-12345678",
    recordedAt: Date.now(),
    amountMl: 250,
  }), true);
  assert.equal(validRecord("hydration", {
    id: "water-12345678",
    recordedAt: Date.now(),
    amountMl: 0,
  }), false);
  assert.equal(validRecord("workout", { ...workout, title: "x".repeat(121) }), false);
  assert.equal(validDelete("workout", "../other-user"), false);
});

test("server projection owns every workout and set regardless of client shape", () => {
  const rows = workoutRows("owner-a", { ...workout, userId: "owner-b" });
  assert.equal(rows.workout.userId, "owner-a");
  assert.equal(rows.sets[0].userId, "owner-a");
  assert.equal(rows.sets[0].workoutId, workout.id);

  const publicValue = publicWorkout(rows.workout, rows.sets);
  assert.equal(publicValue.averageRir, 2);
  assert.equal(publicValue.sets[0].kg, 30);
  assert.equal("userId" in publicValue, false);
});

test("records route authenticates and scopes reads, corrections, deletes, and exports", async () => {
  const [route, requestSecurity] = await Promise.all([
    readFile(new URL("../app/api/records/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/request-security.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(route, /getChatGPTUser\(\)/);
  assert.match(route, /auth\.account\.id/);
  assert.match(route, /eq\(workouts\.userId, auth\.account\.id\)/);
  assert.match(route, /eq\(meals\.userId, auth\.account\.id\)/);
  assert.match(route, /eq\(hydrationEntries\.userId, auth\.account\.id\)/);
  assert.match(route, /Content-Disposition/);
  assert.match(route, /migrateLegacyRecords\(auth\.account\.id\)/);
  assert.match(route, /forge-record-migration-v1/);
  assert.match(route, /mutationRequestProblem\(request/);
  assert.match(requestSecurity, /Cross-site request blocked/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /account_record_corrected/);
  assert.match(route, /eq\(workouts\.id, record\.id\)/);
  assert.match(route, /eq\(meals\.id, meal\.id\)/);
  assert.match(route, /eq\(hydrationEntries\.id, hydration\.id\)/);
  assert.match(route, /correctedAt/);
  assert.ok(
    (route.match(/await db\.batch\(\[/g) ?? []).length >= 5,
    "multi-statement record writes must use atomic D1 batches",
  );
  assert.match(
    route,
    /db\.delete\(workoutSets\)[\s\S]*db\.delete\(workouts\)/,
    "workout deletion must keep child and parent deletion in one ordered batch",
  );
  assert.match(
    route,
    /db\.update\(workouts\)[\s\S]*db\.delete\(workoutSets\)[\s\S]*db\.insert\(workoutSets\)[\s\S]*db\.insert\(auditEvents\)/,
    "workout correction and its audit event must commit together",
  );
  assert.doesNotMatch(route, /value\.record\.userId/);
});

test("client uses durable records with optimistic retry, correction, export, and deliberate deletion", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /function useDurableRecords/);
  assert.match(page, /window\.addEventListener\("online", online\)/);
  assert.match(page, /window\.sessionStorage/);
  assert.match(page, /applyPendingMutations/);
  assert.match(page, /drainPendingMutationQueue/);
  assert.match(page, /withMutationTimeout/);
  assert.match(page, /boundPendingMutationMap/);
  assert.match(page, /meal\.recordedAt >= todayTimestamp/);
  assert.match(page, /entry\.recordedAt >= todayTimestamp/);
  assert.match(page, /"Retry now"/);
  assert.match(page, /method: "PATCH"/);
  assert.match(page, /updateRecord/);
  assert.match(page, /href="\/api\/records\?format=export"/);
  assert.match(page, /window\.confirm\("Remove this completed workout from your account\?"\)/);
  assert.doesNotMatch(page, /useStoredState\("forge-meals"/);
  assert.doesNotMatch(page, /useStoredState\("forge-water"/);
  assert.doesNotMatch(page, /useStoredState<WorkoutSummary\[\]>\("forge-workout-history"/);
});
