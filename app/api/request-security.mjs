import { and, eq, lt, sql } from "drizzle-orm";

export const WRITE_WINDOW_MS = 5 * 60 * 1_000;

export function mutationRequestProblem(request, { requiresJson = false } = {}) {
  const requestOrigin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;

  if (requestOrigin !== expectedOrigin) {
    return { status: 403, error: "Cross-site request blocked." };
  }

  if (requiresJson) {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      return { status: 415, error: "JSON content type required." };
    }
  }

  return null;
}

export async function consumeAccountWriteLimit({
  db,
  table,
  ownerId,
  action,
  limit,
  now = Date.now(),
}) {
  const windowStart = Math.floor(now / WRITE_WINDOW_MS) * WRITE_WINDOW_MS;
  const [row] = await db
    .insert(table)
    .values({
      userId: ownerId,
      action,
      windowStart,
      count: 1,
    })
    .onConflictDoUpdate({
      target: [table.userId, table.action, table.windowStart],
      set: {
        count: sql`${table.count} + 1`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    })
    .returning({ count: table.count });

  const count = Number(row?.count ?? limit + 1);
  if (count === 1) {
    await db.delete(table).where(
      and(
        eq(table.userId, ownerId),
        eq(table.action, action),
        lt(table.windowStart, windowStart - WRITE_WINDOW_MS),
      ),
    );
  }

  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    retryAfter: Math.max(
      1,
      Math.ceil((windowStart + WRITE_WINDOW_MS - now) / 1_000),
    ),
  };
}

export function rateLimitHeaders(result) {
  return {
    "Retry-After": String(result.retryAfter),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
  };
}
