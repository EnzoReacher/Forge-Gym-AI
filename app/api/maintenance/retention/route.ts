import { lt } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents } from "../../../../db/schema";
import { observeApiRequest } from "../../../operational-events.mjs";
import { auditRetentionCutoff } from "../../retention.mjs";
import { authorizeRetentionMaintenance } from "./service.mjs";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  return observeApiRequest(
    "retention_maintenance",
    async () => {
      const authorization = await authorizeRetentionMaintenance(
        request,
        process.env.FORGE_MAINTENANCE_SECRET,
      );
      if (!authorization.ok) {
        return json({ error: authorization.error }, authorization.status);
      }

      const cutoff = auditRetentionCutoff();
      const db = await getDb();
      await db
        .delete(auditEvents)
        .where(lt(auditEvents.createdAt, cutoff));

      return json({
        ok: true,
        retention: "applied",
        cutoff,
      });
    },
    () => json({ error: "Unable to apply retention maintenance." }, 500),
  );
}
