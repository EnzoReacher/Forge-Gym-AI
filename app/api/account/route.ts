import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  auditEvents,
  hydrationEntries,
  meals,
  requestLimits,
  userData,
  users,
  workouts,
  workoutSets,
} from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { observeApiRequest } from "../../operational-events.mjs";
import { mutationRequestProblem } from "../request-security.mjs";
import {
  deletedAccountEmail,
  validAccountDeletion,
} from "./service.mjs";

const MAX_BODY_BYTES = 1_024;

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function readDeletionRequest(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return { error: json({ error: "Deletion request is too large." }, 413) };
  }

  const source = await request.text();
  if (source.length > MAX_BODY_BYTES) {
    return { error: json({ error: "Deletion request is too large." }, 413) };
  }

  try {
    const value = JSON.parse(source) as unknown;
    return validAccountDeletion(value)
      ? { value }
      : { error: json({ error: "Deletion confirmation did not match." }, 400) };
  } catch {
    return { error: json({ error: "Invalid JSON payload." }, 400) };
  }
}

export async function DELETE(request: Request) {
  return observeApiRequest(
    "account_delete",
    async () => {
      const requestProblem = mutationRequestProblem(request, {
        requiresJson: true,
      });
      if (requestProblem) {
        return json({ error: requestProblem.error }, requestProblem.status);
      }

      const identity = await getChatGPTUser();
      if (!identity) {
        return json({ error: "Authentication required." }, 401);
      }

      const email = identity.email.trim().toLowerCase();
      if (!email || email.length > 254) {
        return json({ error: "Invalid authenticated identity." }, 401);
      }

      const payload = await readDeletionRequest(request);
      if ("error" in payload) return payload.error;

      const db = await getDb();
      const account = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      // A repeated request must not recreate an account or reveal whether a
      // previous deletion completed.
      if (!account) return json({ deleted: true });
      if (account.role !== "athlete") {
        return json(
          { error: "Privileged accounts require an administrator-assisted deletion." },
          403,
        );
      }

      const deletionId = crypto.randomUUID();
      await db.batch([
        db.delete(workoutSets).where(eq(workoutSets.userId, account.id)),
        db.delete(workouts).where(eq(workouts.userId, account.id)),
        db.delete(meals).where(eq(meals.userId, account.id)),
        db.delete(hydrationEntries).where(eq(hydrationEntries.userId, account.id)),
        db.delete(userData).where(eq(userData.userId, account.id)),
        db.delete(requestLimits).where(eq(requestLimits.userId, account.id)),
        db.insert(auditEvents).values({
          id: crypto.randomUUID(),
          actorUserId: account.id,
          action: "account_self_deleted",
          targetType: "account",
          targetId: null,
          reason: "Authenticated athlete completed deliberate self-service deletion.",
        }),
        db
          .update(users)
          .set({
            email: deletedAccountEmail(deletionId),
            identityName: null,
            role: "athlete",
            status: "deleted",
            plan: "free",
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(users.id, account.id)),
      ]);

      return json({ deleted: true });
    },
    () => json({ error: "Unable to delete account data." }, 500),
  );
}
