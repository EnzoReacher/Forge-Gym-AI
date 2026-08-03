import { getDb } from "../../../db";
import { requestLimits } from "../../../db/schema";
import { buildCoachReply, COACH_MESSAGE_MAX_LENGTH } from "../../coach-engine.mjs";
import { observeApiRequest } from "../../operational-events.mjs";
import { getCurrentActiveAccount } from "../account-access";
import {
  consumeAccountWriteLimit,
  mutationRequestProblem,
  rateLimitHeaders,
} from "../request-security.mjs";

const MAX_BODY_BYTES = 10_000;
const COACH_REQUEST_LIMIT = 30;
const ALLOWED_PAYLOAD_KEYS = new Set(["message", "context"]);
const ALLOWED_CONTEXT_KEYS = new Set([
  "doneSets",
  "totalSets",
  "proteinGrams",
  "mealCount",
  "goal",
  "trainingDays",
  "style",
]);

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: Set<string>) {
  return Object.keys(value).every((key) => allowed.has(key));
}

function integerIn(value: unknown, min: number, max: number) {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

function validContext(value: unknown) {
  if (!isRecord(value) || !hasOnlyKeys(value, ALLOWED_CONTEXT_KEYS)) return false;
  return integerIn(value.doneSets, 0, 1_000)
    && integerIn(value.totalSets, 0, 1_000)
    && Number(value.doneSets) <= Number(value.totalSets)
    && integerIn(value.proteinGrams, 0, 2_000)
    && integerIn(value.mealCount, 0, 100)
    && ["Strength", "Muscle", "Hybrid"].includes(String(value.goal))
    && ["3 days", "4 days", "5 days"].includes(String(value.trainingDays))
    && ["Protective", "Balanced", "Relentless"].includes(String(value.style));
}

async function readPayload(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return { error: json({ error: "Coach request is too large." }, 413) };
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return { error: json({ error: "Coach request is too large." }, 413) };
  try {
    return { value: JSON.parse(text) as unknown };
  } catch {
    return { error: json({ error: "Invalid JSON payload." }, 400) };
  }
}

export async function POST(request: Request) {
  return observeApiRequest(
    "coach_reply",
    async () => {
      const requestProblem = mutationRequestProblem(request, { requiresJson: true });
      if (requestProblem) return json({ error: requestProblem.error }, requestProblem.status);

      const auth = await getCurrentActiveAccount();
      if ("problem" in auth) return json({ error: auth.problem.error }, auth.problem.status);

      const db = await getDb();
      const requestLimit = await consumeAccountWriteLimit({
        db,
        table: requestLimits,
        ownerId: auth.account.id,
        action: "coach_message",
        limit: COACH_REQUEST_LIMIT,
      });
      if (!requestLimit.allowed) {
        return json(
          { error: "Too many Coach requests. Try again shortly." },
          429,
          rateLimitHeaders(requestLimit),
        );
      }

      const payload = await readPayload(request);
      if ("error" in payload) return payload.error;
      if (!isRecord(payload.value) || !hasOnlyKeys(payload.value, ALLOWED_PAYLOAD_KEYS)) {
        return json({ error: "Invalid Coach request." }, 400);
      }

      const message = payload.value.message;
      const context = payload.value.context;
      if (typeof message !== "string" || !message.trim() || message.length > COACH_MESSAGE_MAX_LENGTH || !validContext(context)) {
        return json({ error: "Invalid Coach request." }, 400);
      }

      return json({ reply: buildCoachReply({ message, context }) });
    },
    () => json({ error: "Coach is temporarily unavailable." }, 500),
  );
}
