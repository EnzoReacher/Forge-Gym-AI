import { and, desc, eq, lt } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  auditEvents,
  hydrationEntries,
  meals,
  requestLimits,
  userData,
  workouts,
  workoutSets,
} from "../../../db/schema";
import { observeApiRequest } from "../../operational-events.mjs";
import { getCurrentActiveAccount } from "../account-access";
import {
  consumeAccountWriteLimit,
  mutationRequestProblem,
  rateLimitHeaders,
} from "../request-security.mjs";
import { auditRetentionCutoff } from "../retention.mjs";
import {
  publicHydration,
  publicMeal,
  publicWorkout,
  validDelete,
  validRecord,
  workoutRows,
} from "./service.mjs";

const MAX_BODY_BYTES = 120_000;
const LEGACY_MIGRATION_KEY = "forge-record-migration-v1";
const RECORD_CREATE_LIMIT = 180;
const RECORD_CHANGE_LIMIT = 60;
function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

async function readPayload(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return { error: json({ error: "Record payload is too large." }, 413) };
  const source = await request.text();
  if (source.length > MAX_BODY_BYTES) return { error: json({ error: "Record payload is too large." }, 413) };
  try {
    return { value: JSON.parse(source) as unknown };
  } catch {
    return { error: json({ error: "Invalid JSON payload." }, 400) };
  }
}

async function listRecords(ownerId: string) {
  const db = await getDb();
  const [workoutRows, setRows, mealRows, hydrationRows] = await Promise.all([
    db.select().from(workouts).where(eq(workouts.userId, ownerId)).orderBy(desc(workouts.completedAt)).limit(100),
    db.select().from(workoutSets).where(eq(workoutSets.userId, ownerId)).orderBy(workoutSets.position),
    db.select().from(meals).where(eq(meals.userId, ownerId)).orderBy(desc(meals.recordedAt)).limit(100),
    db.select().from(hydrationEntries).where(eq(hydrationEntries.userId, ownerId)).orderBy(desc(hydrationEntries.recordedAt)).limit(200),
  ]);

  return {
    workouts: workoutRows.map((workout) => publicWorkout(workout, setRows)),
    meals: mealRows.map(publicMeal),
    hydration: hydrationRows.map(publicHydration),
  };
}

function parseSaved(valueJson: string) {
  try {
    return JSON.parse(valueJson) as unknown;
  } catch {
    return null;
  }
}

function legacyId(prefix: string, value: unknown, index: number) {
  const source = String(value ?? index).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 48);
  return `legacy-${prefix}-${source || index}`;
}

async function migrateLegacyRecords(ownerId: string) {
  const db = await getDb();
  const migrationMarker = await db.query.userData.findFirst({
    where: and(
      eq(userData.userId, ownerId),
      eq(userData.key, LEGACY_MIGRATION_KEY),
    ),
  });
  if (migrationMarker) return;

  const [existingWorkout, existingMeal, existingHydration] = await Promise.all([
    db.query.workouts.findFirst({ where: eq(workouts.userId, ownerId) }),
    db.query.meals.findFirst({ where: eq(meals.userId, ownerId) }),
    db.query.hydrationEntries.findFirst({ where: eq(hydrationEntries.userId, ownerId) }),
  ]);
  const legacyRows = await db.select().from(userData).where(eq(userData.userId, ownerId));
  const legacy = new Map(legacyRows.map((row) => [row.key, parseSaved(row.valueJson)]));

  if (!existingWorkout) {
    const history = legacy.get("forge-workout-history");
    if (Array.isArray(history)) {
      const safeRows = history.slice(0, 100).flatMap((value, index) => {
        if (!value || typeof value !== "object") return [];
        const item = value as Record<string, unknown>;
        if (typeof item.completedAt !== "number" || typeof item.title !== "string") return [];
        return [{
          id: legacyId("workout", item.id, index),
          userId: ownerId,
          completedAt: Math.round(item.completedAt),
          title: item.title.slice(0, 120),
          durationSeconds: Math.max(1, Math.round(Number(item.durationSeconds) || 1)),
          completedSets: Math.max(1, Math.round(Number(item.completedSets) || 1)),
          totalSets: Math.max(1, Math.round(Number(item.totalSets) || 1)),
          exerciseCount: Math.max(1, Math.round(Number(item.exerciseCount) || 1)),
          volume: Math.max(0, Math.round(Number(item.volume) || 0)),
          averageRir: Math.max(0, Math.min(10_000, Math.round((Number(item.averageRir) || 0) * 1_000))),
          bestSet: String(item.bestSet ?? "Imported workout").slice(0, 240),
          note: String(item.note ?? "").slice(0, 2_000),
        }];
      });
      if (safeRows.length) await db.insert(workouts).values(safeRows).onConflictDoNothing();
    }
  }

  if (!existingMeal) {
    const savedMeals = legacy.get("forge-meals");
    if (Array.isArray(savedMeals)) {
      const safeRows = savedMeals.slice(0, 100).flatMap((value, index) => {
        if (!value || typeof value !== "object") return [];
        const item = value as Record<string, unknown>;
        if (typeof item.name !== "string") return [];
        const fallbackTime = Date.now() - index;
        return [{
          id: legacyId("meal", item.id, index),
          userId: ownerId,
          recordedAt: typeof item.id === "number" ? Math.round(item.id) : fallbackTime,
          time: String(item.time ?? "").slice(0, 8),
          name: item.name.slice(0, 120),
          detail: String(item.detail ?? "").slice(0, 300),
          kcal: Math.max(0, Math.min(20_000, Math.round(Number(item.kcal) || 0))),
          proteinGrams: Math.max(0, Math.min(2_000, Math.round(Number(item.protein) || 0))),
        }];
      });
      if (safeRows.length) await db.insert(meals).values(safeRows).onConflictDoNothing();
    }
  }

  if (!existingHydration) {
    const savedWater = legacy.get("forge-water");
    if (typeof savedWater === "number" && savedWater > 0) {
      await db.insert(hydrationEntries).values({
        id: "legacy-water-total",
        userId: ownerId,
        recordedAt: Date.now(),
        amountMl: Math.min(10_000, Math.round(savedWater)),
      }).onConflictDoNothing();
    }
  }

  await db.insert(userData).values({
    id: crypto.randomUUID(),
    userId: ownerId,
    key: LEGACY_MIGRATION_KEY,
    valueJson: JSON.stringify({ completed: true, version: 1 }),
  }).onConflictDoNothing({
    target: [userData.userId, userData.key],
  });
}

export async function GET(request: Request) {
  return observeApiRequest(
    "account_records_read",
    async () => {
      const auth = await getCurrentActiveAccount();
      if ("problem" in auth) {
        return json({ error: auth.problem.error }, auth.problem.status);
      }
      await migrateLegacyRecords(auth.account.id);
      const records = await listRecords(auth.account.id);
      const exportRequested = new URL(request.url).searchParams.get("format") === "export";
      if (!exportRequested) return json(records);

      return json(
        {
          exportedAt: new Date().toISOString(),
          format: "forge-account-records-v1",
          ...records,
        },
        200,
        {
          "Content-Disposition": `attachment; filename="forge-records-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      );
    },
    () => json({ error: "Unable to load account records." }, 500),
  );
}

export async function POST(request: Request) {
  return observeApiRequest(
    "account_records_write",
    async () => {
      const requestProblem = mutationRequestProblem(request, { requiresJson: true });
      if (requestProblem) return json({ error: requestProblem.error }, requestProblem.status);

      const auth = await getCurrentActiveAccount();
      if ("problem" in auth) {
        return json({ error: auth.problem.error }, auth.problem.status);
      }
      const db = await getDb();
      await db
        .delete(auditEvents)
        .where(lt(auditEvents.createdAt, auditRetentionCutoff()));
      const writeLimit = await consumeAccountWriteLimit({
        db,
        table: requestLimits,
        ownerId: auth.account.id,
        action: "account_records_create",
        limit: RECORD_CREATE_LIMIT,
      });
      if (!writeLimit.allowed) {
        return json(
          { error: "Too many new records. Try again shortly." },
          429,
          rateLimitHeaders(writeLimit),
        );
      }

      const payload = await readPayload(request);
      if ("error" in payload) return payload.error;
      const value = payload.value as { type?: unknown; record?: unknown };
      if (!value || typeof value !== "object" || typeof value.type !== "string" || !validRecord(value.type, value.record)) {
        return json({ error: "Invalid record payload." }, 400);
      }

      if (value.type === "workout") {
        const rows = workoutRows(auth.account.id, value.record);
        await db.batch([
          db.insert(workouts).values(rows.workout).onConflictDoNothing(),
          db.insert(workoutSets).values(rows.sets).onConflictDoNothing(),
        ]);
      } else if (value.type === "meal") {
        const record = value.record as {
          id: string; recordedAt: number; time: string; name: string;
          detail: string; kcal: number; protein: number;
        };
        await db.insert(meals).values({
          id: record.id,
          userId: auth.account.id,
          recordedAt: Math.round(record.recordedAt),
          time: record.time,
          name: record.name.trim(),
          detail: record.detail.trim(),
          kcal: Math.round(record.kcal),
          proteinGrams: Math.round(record.protein),
        }).onConflictDoNothing();
      } else {
        const record = value.record as { id: string; recordedAt: number; amountMl: number };
        await db.insert(hydrationEntries).values({
          id: record.id,
          userId: auth.account.id,
          recordedAt: Math.round(record.recordedAt),
          amountMl: record.amountMl,
        }).onConflictDoNothing();
      }

      return json({ saved: true }, 201);
    },
    () => json({ error: "Unable to save account record." }, 500),
  );
}

export async function PATCH(request: Request) {
  return observeApiRequest(
    "account_records_write",
    async () => {
      const requestProblem = mutationRequestProblem(request, { requiresJson: true });
      if (requestProblem) return json({ error: requestProblem.error }, requestProblem.status);

      const auth = await getCurrentActiveAccount();
      if ("problem" in auth) {
        return json({ error: auth.problem.error }, auth.problem.status);
      }
      const db = await getDb();
      await db
        .delete(auditEvents)
        .where(lt(auditEvents.createdAt, auditRetentionCutoff()));
      const writeLimit = await consumeAccountWriteLimit({
        db,
        table: requestLimits,
        ownerId: auth.account.id,
        action: "account_records_change",
        limit: RECORD_CHANGE_LIMIT,
      });
      if (!writeLimit.allowed) {
        return json(
          { error: "Too many record changes. Try again shortly." },
          429,
          rateLimitHeaders(writeLimit),
        );
      }

      const payload = await readPayload(request);
      if ("error" in payload) return payload.error;
      const value = payload.value as { type?: unknown; record?: unknown };
      if (!value || typeof value !== "object" || typeof value.type !== "string" || !validRecord(value.type, value.record)) {
        return json({ error: "Invalid record correction." }, 400);
      }

      const record = value.record as { id: string };
      const correctedAt = new Date().toISOString();
      const audit = {
        id: crypto.randomUUID(),
        actorUserId: auth.account.id,
        action: "account_record_corrected",
        targetType: value.type,
        targetId: record.id,
        reason: "User corrected their own record.",
      };

      if (value.type === "workout") {
        const existing = await db.query.workouts.findFirst({
          where: and(
            eq(workouts.userId, auth.account.id),
            eq(workouts.id, record.id),
          ),
        });
        if (!existing) return json({ error: "Workout record was not found." }, 404);

        const rows = workoutRows(auth.account.id, value.record);
        await db.batch([
          db.update(workouts).set({
            completedAt: rows.workout.completedAt,
            title: rows.workout.title,
            durationSeconds: rows.workout.durationSeconds,
            completedSets: rows.workout.completedSets,
            totalSets: rows.workout.totalSets,
            exerciseCount: rows.workout.exerciseCount,
            volume: rows.workout.volume,
            averageRir: rows.workout.averageRir,
            bestSet: rows.workout.bestSet,
            note: rows.workout.note,
            correctedAt,
          }).where(and(
            eq(workouts.userId, auth.account.id),
            eq(workouts.id, record.id),
          )),
          db.delete(workoutSets).where(and(
            eq(workoutSets.userId, auth.account.id),
            eq(workoutSets.workoutId, record.id),
          )),
          db.insert(workoutSets).values(rows.sets),
          db.insert(auditEvents).values(audit),
        ]);
      } else if (value.type === "meal") {
        const meal = value.record as {
          id: string; recordedAt: number; time: string; name: string;
          detail: string; kcal: number; protein: number;
        };
        const existing = await db.query.meals.findFirst({
          where: and(
            eq(meals.userId, auth.account.id),
            eq(meals.id, meal.id),
          ),
        });
        if (!existing) return json({ error: "Meal record was not found." }, 404);
        await db.batch([
          db.update(meals).set({
            recordedAt: Math.round(meal.recordedAt),
            time: meal.time,
            name: meal.name.trim(),
            detail: meal.detail.trim(),
            kcal: Math.round(meal.kcal),
            proteinGrams: Math.round(meal.protein),
            correctedAt,
          }).where(and(
            eq(meals.userId, auth.account.id),
            eq(meals.id, meal.id),
          )),
          db.insert(auditEvents).values(audit),
        ]);
      } else {
        const hydration = value.record as { id: string; recordedAt: number; amountMl: number };
        const existing = await db.query.hydrationEntries.findFirst({
          where: and(
            eq(hydrationEntries.userId, auth.account.id),
            eq(hydrationEntries.id, hydration.id),
          ),
        });
        if (!existing) return json({ error: "Hydration record was not found." }, 404);
        await db.batch([
          db.update(hydrationEntries).set({
            recordedAt: Math.round(hydration.recordedAt),
            amountMl: hydration.amountMl,
            correctedAt,
          }).where(and(
            eq(hydrationEntries.userId, auth.account.id),
            eq(hydrationEntries.id, hydration.id),
          )),
          db.insert(auditEvents).values(audit),
        ]);
      }

      return json({ corrected: true, correctedAt });
    },
    () => json({ error: "Unable to correct account record." }, 500),
  );
}

export async function DELETE(request: Request) {
  return observeApiRequest(
    "account_records_delete",
    async () => {
      const requestProblem = mutationRequestProblem(request);
      if (requestProblem) return json({ error: requestProblem.error }, requestProblem.status);

      const url = new URL(request.url);
      const type = url.searchParams.get("type") ?? "";
      const id = url.searchParams.get("id") ?? "";
      if (!validDelete(type, id)) return json({ error: "Invalid record target." }, 400);

      const auth = await getCurrentActiveAccount();
      if ("problem" in auth) {
        return json({ error: auth.problem.error }, auth.problem.status);
      }
      const db = await getDb();
      await db
        .delete(auditEvents)
        .where(lt(auditEvents.createdAt, auditRetentionCutoff()));
      const writeLimit = await consumeAccountWriteLimit({
        db,
        table: requestLimits,
        ownerId: auth.account.id,
        action: "account_records_change",
        limit: RECORD_CHANGE_LIMIT,
      });
      if (!writeLimit.allowed) {
        return json(
          { error: "Too many record changes. Try again shortly." },
          429,
          rateLimitHeaders(writeLimit),
        );
      }

      if (type === "workout") {
        await db.batch([
          db.delete(workoutSets).where(and(
            eq(workoutSets.userId, auth.account.id),
            eq(workoutSets.workoutId, id),
          )),
          db.delete(workouts).where(and(
            eq(workouts.userId, auth.account.id),
            eq(workouts.id, id),
          )),
        ]);
      } else if (type === "meal") {
        await db.delete(meals).where(and(
          eq(meals.userId, auth.account.id),
          eq(meals.id, id),
        ));
      } else {
        await db.delete(hydrationEntries).where(and(
          eq(hydrationEntries.userId, auth.account.id),
          eq(hydrationEntries.id, id),
        ));
      }

      return json({ deleted: true });
    },
    () => json({ error: "Unable to delete account record." }, 500),
  );
}
