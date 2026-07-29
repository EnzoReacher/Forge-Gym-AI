const SOURCE = "forge-web";

function writeOperationalEvent(entry) {
  const serialized = JSON.stringify(entry);
  if (entry.status >= 500) {
    console.error(serialized);
  } else if (entry.status >= 400) {
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
 * @param {"account_state_read" | "account_state_write"} event
 * @param {() => Promise<Response>} handler
 * @param {() => Response} failureResponse
 */
export async function observeApiRequest(event, handler, failureResponse) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const response = await handler();
    writeOperationalEvent({
      source: SOURCE,
      event,
      outcome: response.status < 500 ? "completed" : "failed",
      status: response.status,
      durationMs: Date.now() - startedAt,
      requestId,
    });
    return attachRequestId(response, requestId);
  } catch {
    const response = failureResponse();
    writeOperationalEvent({
      source: SOURCE,
      event,
      outcome: "failed",
      status: response.status,
      durationMs: Date.now() - startedAt,
      requestId,
    });
    return attachRequestId(response, requestId);
  }
}
