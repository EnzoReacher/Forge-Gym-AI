import { sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { observeApiRequest } from "../../operational-events.mjs";

function healthResponse(status: "ok" | "degraded", httpStatus: number) {
  return Response.json(
    {
      status,
      checks: {
        service: "ok",
        database: status,
      },
    },
    {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function GET() {
  return observeApiRequest(
    "release_health",
    async () => {
      const db = await getDb();
      const result = await db.get<{ ok: number }>(sql`select 1 as ok`);

      return result?.ok === 1
        ? healthResponse("ok", 200)
        : healthResponse("degraded", 503);
    },
    () => healthResponse("degraded", 503),
  );
}
