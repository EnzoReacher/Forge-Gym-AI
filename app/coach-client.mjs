import { COACH_MESSAGE_MAX_LENGTH, isCoachReply } from "./coach-engine.mjs";

export class CoachRequestError extends Error {
  constructor(code) {
    super(code);
    this.name = "CoachRequestError";
    this.code = code;
  }
}

export async function requestCoachReply(payload, { fetchImpl = fetch, timeoutMs = 8_000 } = {}) {
  if (!payload || typeof payload.message !== "string" || !payload.message.trim() || payload.message.length > COACH_MESSAGE_MAX_LENGTH) {
    throw new CoachRequestError("invalid_request");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(250, Math.min(timeoutMs, 15_000)));
  try {
    const response = await fetchImpl("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) throw new CoachRequestError(response.status === 429 ? "rate_limited" : "unavailable");
    const body = await response.json();
    if (!body || Object.keys(body).length !== 1 || !isCoachReply(body.reply)) {
      throw new CoachRequestError("invalid_response");
    }
    return body.reply;
  } catch (error) {
    if (error instanceof CoachRequestError) throw error;
    if (controller.signal.aborted) throw new CoachRequestError("timeout");
    throw new CoachRequestError("unavailable");
  } finally {
    clearTimeout(timeout);
  }
}
