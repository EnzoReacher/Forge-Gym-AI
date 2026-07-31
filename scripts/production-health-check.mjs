import { pathToFileURL } from "node:url";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_DELAY_MS = 5_000;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function normalizedHealthUrl(baseUrl) {
  const url = new URL(baseUrl);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("The production URL must be credential-free HTTPS.");
  }
  return new URL("/api/health", url);
}

function validHealthPayload(value) {
  return (
    value &&
    typeof value === "object" &&
    value.status === "ok" &&
    value.checks &&
    typeof value.checks === "object" &&
    value.checks.service === "ok" &&
    value.checks.database === "ok"
  );
}

async function checkOnce({ fetchImpl, url, token, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const headers = {
      Accept: "application/json",
      "User-Agent": "forge-production-health/1",
    };
    if (token) {
      headers["OAI-Sites-Authorization"] = `Bearer ${token}`;
    }

    const response = await fetchImpl(url, {
      method: "GET",
      headers,
      redirect: "error",
      signal: controller.signal,
    });
    const durationMs = Date.now() - startedAt;
    const body = await response.text();

    if (body.length > 10_000) {
      return { ok: false, status: response.status, durationMs, reason: "invalid_body" };
    }

    let payload = null;
    try {
      payload = JSON.parse(body);
    } catch {
      return { ok: false, status: response.status, durationMs, reason: "invalid_json" };
    }

    return response.status === 200 && validHealthPayload(payload)
      ? { ok: true, status: 200, durationMs, reason: "ok" }
      : { ok: false, status: response.status, durationMs, reason: "degraded" };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      reason: error instanceof Error && error.name === "AbortError" ? "timeout" : "network",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runProductionHealthCheck({
  baseUrl,
  token = "",
  fetchImpl = fetch,
  maxAttempts = 2,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
} = {}) {
  const url = normalizedHealthUrl(baseUrl);
  let lastResult = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    lastResult = await checkOnce({ fetchImpl, url, token, timeoutMs });
    if (lastResult.ok) return { ...lastResult, attempts: attempt };
    if (attempt < maxAttempts) await wait(retryDelayMs);
  }

  return { ...lastResult, attempts: maxAttempts };
}

async function main() {
  const baseUrl = process.env.FORGE_PRODUCTION_URL;
  const token = process.env.FORGE_SITES_BYPASS_TOKEN;

  if (!baseUrl || !token) {
    console.error(
      "FORGE production health check is not configured. Required repository secrets are missing.",
    );
    return 2;
  }

  let result;
  try {
    result = await runProductionHealthCheck({ baseUrl, token });
  } catch {
    console.error("FORGE production health check configuration is invalid.");
    return 2;
  }

  if (result.ok) {
    console.log(
      `FORGE production health passed in ${result.durationMs} ms after ${result.attempts} attempt(s).`,
    );
    return 0;
  }

  console.error(
    `FORGE production health failed after ${result.attempts} attempts (status ${result.status}, reason ${result.reason}).`,
  );
  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
