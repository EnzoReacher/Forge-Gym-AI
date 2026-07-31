function requiredValue(name, value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} is required.`);
  }
  return value.trim();
}

export async function runRetentionMaintenance({
  baseUrl,
  maintenanceSecret,
  sitesToken,
  fetchImpl = fetch,
}) {
  const url = new URL(
    "/api/maintenance/retention",
    requiredValue("FORGE_PRODUCTION_URL", baseUrl),
  );
  const secret = requiredValue(
    "FORGE_MAINTENANCE_SECRET",
    maintenanceSecret,
  );
  if (new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error("FORGE_MAINTENANCE_SECRET must be at least 32 bytes.");
  }

  const headers = {
    Accept: "application/json",
    "X-Forge-Maintenance-Key": secret,
  };
  if (typeof sitesToken === "string" && sitesToken.trim()) {
    headers["OAI-Sites-Authorization"] = `Bearer ${sitesToken.trim()}`;
  }

  const response = await fetchImpl(url, {
    method: "POST",
    headers,
    redirect: "error",
  });
  if (!response.ok) {
    throw new Error(`Retention maintenance failed with HTTP ${response.status}.`);
  }

  const result = await response.json();
  if (
    result?.ok !== true ||
    result?.retention !== "applied" ||
    typeof result?.cutoff !== "string"
  ) {
    throw new Error("Retention maintenance returned an invalid response.");
  }

  return { cutoff: result.cutoff };
}

async function main() {
  const result = await runRetentionMaintenance({
    baseUrl: process.env.FORGE_PRODUCTION_URL,
    maintenanceSecret: process.env.FORGE_MAINTENANCE_SECRET,
    sitesToken: process.env.FORGE_SITES_BYPASS_TOKEN,
  });
  console.log(`Retention maintenance completed through ${result.cutoff} UTC.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : "Retention maintenance failed.",
    );
    process.exitCode = 1;
  });
}
