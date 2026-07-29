import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { userData, users } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

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

type Account = typeof users.$inferSelect;

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function normalizedKey(request: Request) {
  const key = new URL(request.url).searchParams.get("key") ?? "";
  return ALLOWED_KEYS.has(key) ? key : null;
}

async function currentAccount(): Promise<
  { account: Account } | { response: Response }
> {
  const identity = await getChatGPTUser();
  if (!identity) return { response: json({ error: "Authentication required." }, 401) };

  const email = identity.email.trim().toLowerCase();
  if (!email || email.length > 254) {
    return { response: json({ error: "Invalid authenticated identity." }, 401) };
  }

  const db = await getDb();
  let account = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!account) {
    await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        email,
        identityName: identity.fullName,
      })
      .onConflictDoNothing({ target: users.email });

    account = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
  } else if (identity.fullName && identity.fullName !== account.identityName) {
    await db
      .update(users)
      .set({
        identityName: identity.fullName,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(users.id, account.id));
  }

  if (!account || account.status !== "active") {
    return { response: json({ error: "Account access is unavailable." }, 403) };
  }

  return { account };
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
    typeof value.notifications === "boolean"
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
  try {
    const key = normalizedKey(request);
    if (!key) return json({ error: "Unsupported state key." }, 400);

    const auth = await currentAccount();
    if ("response" in auth) return auth.response;

    const db = await getDb();
    const row = await db.query.userData.findFirst({
      where: and(eq(userData.userId, auth.account.id), eq(userData.key, key)),
    });

    if (!row) return json({ value: null });

    try {
      return json({ value: JSON.parse(row.valueJson) });
    } catch {
      return json({ error: "Saved state is unavailable." }, 500);
    }
  } catch {
    return json({ error: "Unable to load account data." }, 500);
  }
}

export async function PUT(request: Request) {
  try {
    const key = normalizedKey(request);
    if (!key) return json({ error: "Unsupported state key." }, 400);

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

    const auth = await currentAccount();
    if ("response" in auth) return auth.response;

    const db = await getDb();
    await db
      .insert(userData)
      .values({
        id: crypto.randomUUID(),
        userId: auth.account.id,
        key,
        valueJson: JSON.stringify(payload.value),
      })
      .onConflictDoUpdate({
        target: [userData.userId, userData.key],
        set: {
          valueJson: JSON.stringify(payload.value),
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      });

    return json({ saved: true });
  } catch {
    return json({ error: "Unable to save account data." }, 500);
  }
}
