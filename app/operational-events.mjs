const SOURCE = "forge-web";
const SLOW_REQUEST_MS = 1_500;
const VERY_SLOW_REQUEST_MS = 3_000;

export function classifyOperationalEvent(event, status, durationMs) {
  if (status >= 500) {
    return { severity: "error", signal: "service_failure" };
  }
  if (durationMs >= VERY_SLOW_REQUEST_MS) {
    return { severity: "error", signal: "latency" };
  }
  if (durationMs >= SLOW_REQUEST_MS) {
    return { severity: "warning", signal: "latency" };
  }
  if (status === 429) {
    return { severity: "warning", signal: "rate_limit" };
  }
  if ((status === 401 || status === 403) && event !== "release_health") {
    return { severity: "notice", signal: "auth_failure" };
  }
  if (status >= 400) {
    return { severity: "notice", signal: "client_rejection" };
  }
  return { severity: "info", signal: "none" };
}

function writeOperationalEvent(entry) {
  const serialized = JSON.stringify(entry);
  if (entry.severity === "error") {
    console.error(serialized);
  } else if (entry.severity === "warning" || entry.severity === "notice") {
    console.warn(serialized);
  } else {
    console.info(serialized);
  }
}

function attachRequestId(response, requestId) {
  const headers = new Headers(response.headers);
  headers.set("X-Request-Id", requestId);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Records only a fixed event name, outcome, status, duration, and generated
 * request ID. User identity, state values, request bodies, and URLs are never
 * accepted as telemetry fields.
 *
 * @param {"account_state_read" | "account_state_write" | "account_records_read" | "account_records_write" | "account_records_delete" | "account_delete" | "release_health" | "retention_maintenance"} event
 * @param {() => Promise<Response>} handler
 * @param {() => Response} failureResponse
 */
export async function observeApiRequest(event, handler, failureResponse) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const response = await handler();
    const durationMs = Date.now() - startedAt;
    const classification = classifyOperationalEvent(event, response.status, durationMs);
    writeOperationalEvent({
      source: SOURCE,
      event,
      outcome: response.status < 500 ? "completed" : "failed",
      status: response.status,
      durationMs,
      ...classification,
      requestId,
    });
    return attachRequestId(response, requestId);
  } catch {
    const response = failureResponse();
    const durationMs = Date.now() - startedAt;
    const classification = classifyOperationalEvent(event, response.status, durationMs);
    writeOperationalEvent({
      source: SOURCE,
      event,
      outcome: "failed",
      status: response.status,
      durationMs,
      ...classification,
      requestId,
    });
    return attachRequestId(response, requestId);
  }
}
