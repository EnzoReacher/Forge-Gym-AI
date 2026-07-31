const MIN_SECRET_BYTES = 32;
const MAX_SECRET_BYTES = 512;
const SECRET_HEADER = "x-forge-maintenance-key";
const encoder = new TextEncoder();

function byteLength(value) {
  return encoder.encode(value).byteLength;
}

async function sha256(value) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(value)),
  );
}

async function constantTimeMatch(left, right) {
  const [leftDigest, rightDigest] = await Promise.all([
    sha256(left),
    sha256(right),
  ]);
  let difference = 0;

  for (let index = 0; index < leftDigest.length; index += 1) {
    difference |= leftDigest[index] ^ rightDigest[index];
  }

  return difference === 0;
}

export async function authorizeRetentionMaintenance(request, configuredSecret) {
  if (
    typeof configuredSecret !== "string" ||
    byteLength(configuredSecret) < MIN_SECRET_BYTES ||
    byteLength(configuredSecret) > MAX_SECRET_BYTES
  ) {
    return {
      ok: false,
      status: 503,
      error: "Retention maintenance is not configured.",
    };
  }

  const presentedSecret = request.headers.get(SECRET_HEADER) ?? "";
  if (
    byteLength(presentedSecret) < MIN_SECRET_BYTES ||
    byteLength(presentedSecret) > MAX_SECRET_BYTES ||
    !(await constantTimeMatch(presentedSecret, configuredSecret))
  ) {
    return {
      ok: false,
      status: 401,
      error: "Maintenance authorization failed.",
    };
  }

  return { ok: true };
}
