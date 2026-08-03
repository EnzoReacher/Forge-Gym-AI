export const ACCOUNT_LOAD_TIMEOUT_MS = 6_000;
export const ACCOUNT_LOAD_ATTEMPTS = 2;

export async function withAccountLoadTimeout(
  run,
  timeoutMs = ACCOUNT_LOAD_TIMEOUT_MS,
) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("A positive account-load timeout is required.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadAccountResource(
  run,
  {
    attempts = ACCOUNT_LOAD_ATTEMPTS,
    timeoutMs = ACCOUNT_LOAD_TIMEOUT_MS,
    shouldRetry = () => true,
  } = {},
) {
  if (!Number.isSafeInteger(attempts) || attempts < 1 || attempts > 3) {
    throw new Error("Account loads require between one and three attempts.");
  }

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await withAccountLoadTimeout(
        (signal) => run(signal, attempt),
        timeoutMs,
      );
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !shouldRetry(error)) throw error;
    }
  }

  throw lastError;
}
