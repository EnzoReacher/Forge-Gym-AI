import { and, eq, lt, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditEvents, requestLimits, userData } from "../../../db/schema";
import { observeApiRequest } from "../../operational-events.mjs";
import { getCurrentActiveAccount } from "../account-access";
import {
  consumeAccountWriteLimit,
  mutationRequestProblem,
  rateLimitHeaders,
} from "../request-security.mjs";
import { auditRetentionCutoff } from "../retention.mjs";
import {
  CorruptSavedStateError,
  loadAccountState,
  saveAccountState,
} from "./service.mjs";

const ALLOWED_KEYS = new Set([
  "forge-exercises",
  "forge-meals",
  "forge-water",
  "forge-workout-live",
  "forge-workout-started-at",
  "forge-workout-history",
  "forge-profile",
]);

const MAX_BODY_BYTES = 200_000;
const STATE_WRITE_LIMIT = 120;

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

function normalizedKey(request: Request) {
  const key = new URL(request.url).searchParams.get("key") ?? "";
  return ALLOWED_KEYS.has(key) ? key : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validString(value: unknown, max: number) {
  return typeof value === "string" && value.length <= max;
}

function validFiniteNumber(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function validSet(value: unknown) {
  return (
    isRecord(value) &&
    validFiniteNumber(value.kg, 0, 1_000) &&
    validFiniteNumber(value.reps, 0, 1_000) &&
    (value.rir === undefined || validFiniteNumber(value.rir, 0, 10)) &&
    typeof value.done === "boolean"
  );
}

function validExercise(value: unknown) {
  return (
    isRecord(value) &&
    validString(value.id, 80) &&
    validString(value.name, 120) &&
    validString(value.target, 80) &&
    validString(value.cue, 240) &&
    Array.isArray(value.sets) &&
    value.sets.length <= 20 &&
    value.sets.every(validSet)
  );
}

function validMeal(value: unknown) {
  return (
    isRecord(value) &&
    validFiniteNumber(value.id, 0, Number.MAX_SAFE_INTEGER) &&
    validString(value.time, 8) &&
    validString(value.name, 120) &&
    validString(value.detail, 300) &&
    validFiniteNumber(value.kcal, 0, 20_000) &&
    validFiniteNumber(value.protein, 0, 2_000)
  );
}

function validWorkout(value: unknown) {
  return (
    isRecord(value) &&
    validFiniteNumber(value.id, 0, Number.MAX_SAFE_INTEGER) &&
    validFiniteNumber(value.completedAt, 0, Number.MAX_SAFE_INTEGER) &&
    validString(value.title, 120) &&
    validFiniteNumber(value.durationSeconds, 0, 172_800) &&
    validFiniteNumber(value.completedSets, 0, 1_000) &&
    validFiniteNumber(value.totalSets, 0, 1_000) &&
    validFiniteNumber(value.exerciseCount, 0, 100) &&
    validFiniteNumber(value.volume, 0, 100_000_000) &&
    validFiniteNumber(value.averageRir, 0, 10) &&
    validString(value.bestSet, 240) &&
    validString(value.note, 2_000)
  );
}

function validProfile(value: unknown) {
  return (
    isRecord(value) &&
    validString(value.displayName, 80) &&
    ["Metric", "Imperial"].includes(String(value.units)) &&
    typeof value.notifications === "boolean" &&
    (value.trainingGoal === undefined || ["Strength", "Muscle", "Hybrid"].includes(String(value.trainingGoal))) &&
    (value.trainingDays === undefined || ["3 days", "4 days", "5 days"].includes(String(value.trainingDays))) &&
    (value.coachStyle === undefined || ["Protective", "Balanced", "Relentless"].includes(String(value.coachStyle))) &&
    (value.trainingSlot === undefined || (
      typeof value.trainingSlot === "number" &&
      Number.isInteger(value.trainingSlot) &&
      validFiniteNumber(value.trainingSlot, 1, 5)
    )) &&
    (value.adultConfirmedAt === undefined || (
      validString(value.adultConfirmedAt, 40) &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.adultConfirmedAt) &&
      !Number.isNaN(Date.parse(value.adultConfirmedAt))
    ))
  );
}

function validValue(key: string, value: unknown) {
  switch (key) {
    case "forge-exercises":
      return Array.isArray(value) && value.length <= 30 && value.every(validExercise);
    case "forge-meals":
      return Array.isArray(value) && value.length <= 100 && value.every(validMeal);
    case "forge-water":
      return validFiniteNumber(value, 0, 10_000);
    case "forge-workout-live":
      return typeof value === "boolean";
    case "forge-workout-started-at":
      return validFiniteNumber(value, 0, Number.MAX_SAFE_INTEGER);
    case "forge-workout-history":
      return Array.isArray(value) && value.length <= 100 && value.every(validWorkout);
    case "forge-profile":
      return validProfile(value);
    default:
      return false;
  }
}

export async function GET(request: Request) {
  return observeApiRequest(
    "account_state_read",
    async () => {
    const key = normalizedKey(request);
    if (!key) return json({ error: "Unsupported state key." }, 400);

      const auth = await getCurrentActiveAccount();
      if ("problem" in auth) {
        return json({ error: auth.problem.error }, auth.problem.status);
      }

    const db = await getDb();
    try {
      const value = await loadAccountState(
        {
          findForOwner: (ownerId, stateKey) =>
            db.query.userData.findFirst({
              where: and(
                eq(userData.userId, ownerId),
                eq(userData.key, stateKey),
              ),
            }),
        },
        auth.account.id,
        key,
      );
      return json({ value });
    } catch (error) {
      if (!(error instanceof CorruptSavedStateError)) throw error;
      return json({ error: "Saved state is unavailable." }, 500);
    }
    },
    () => json({ error: "Unable to load account data." }, 500),
  );
}

export async function PUT(request: Request) {
  return observeApiRequest(
    "account_state_write",
    async () => {
    const requestProblem = mutationRequestProblem(request, { requiresJson: true });
    if (requestProblem) {
      return json({ error: requestProblem.error }, requestProblem.status);
    }

    const key = normalizedKey(request);
    if (!key) return json({ error: "Unsupported state key." }, 400);

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
      action: "account_state_write",
      limit: STATE_WRITE_LIMIT,
    });
    if (!writeLimit.allowed) {
      return json(
        { error: "Too many account updates. Try again shortly." },
        429,
        rateLimitHeaders(writeLimit),
      );
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return json({ error: "State payload is too large." }, 413);
    }

    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return json({ error: "State payload is too large." }, 413);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return json({ error: "Invalid JSON payload." }, 400);
    }

    if (!isRecord(payload) || !validValue(key, payload.value)) {
      return json({ error: "Invalid state payload." }, 400);
    }

    await saveAccountState(
      {
        upsertForOwner: async (ownerId, stateKey, valueJson) => {
          await db
            .insert(userData)
            .values({
              id: crypto.randomUUID(),
              userId: ownerId,
              key: stateKey,
              valueJson,
            })
            .onConflictDoUpdate({
              target: [userData.userId, userData.key],
              set: {
                valueJson,
                updatedAt: sql`CURRENT_TIMESTAMP`,
              },
            });
        },
      },
      auth.account.id,
      key,
      payload.value,
    );

    return json({ saved: true });
    },
    () => json({ error: "Unable to save account data." }, 500),
  );
}
