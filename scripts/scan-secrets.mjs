import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MAX_SCANNED_BYTES = 2 * 1024 * 1024;
const SAFE_ENV_TEMPLATES = new Set([
  ".env.example",
  ".env.sample",
  ".env.template",
]);

const CONTENT_RULES = [
  {
    name: "private key",
    pattern: /-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----/,
  },
  { name: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  {
    name: "OpenAI API key",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,
  },
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Stripe live secret", pattern: /\bsk_live_[A-Za-z0-9]{16,}\b/ },
  { name: "Slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
];

export function secretFilenameRule(filePath) {
  const basename = path.basename(filePath).toLowerCase();

  if (
    (basename === ".env" || basename.startsWith(".env.")) &&
    !SAFE_ENV_TEMPLATES.has(basename)
  ) {
    return "environment file";
  }

  if ([".pem", ".key", ".p12", ".pfx"].includes(path.extname(basename))) {
    return "credential file";
  }

  if (["id_rsa", "id_dsa", "id_ecdsa", "id_ed25519"].includes(basename)) {
    return "private key file";
  }

  if (basename === "credentials.json") {
    return "credential file";
  }

  return null;
}

export function secretContentRules(content) {
  return CONTENT_RULES.filter(({ pattern }) => pattern.test(content)).map(
    ({ name }) => name,
  );
}

export function scanTrackedFiles(root = process.cwd()) {
  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const trackedFiles = output.split("\0").filter(Boolean);
  const findings = [];

  for (const file of trackedFiles) {
    const filenameRule = secretFilenameRule(file);
    if (filenameRule) {
      findings.push({ file, rule: filenameRule });
      continue;
    }

    const absolutePath = path.join(root, file);
    if (statSync(absolutePath).size > MAX_SCANNED_BYTES) continue;

    const buffer = readFileSync(absolutePath);
    if (buffer.includes(0)) continue;

    for (const rule of secretContentRules(buffer.toString("utf8"))) {
      findings.push({ file, rule });
    }
  }

  return findings;
}

export function main() {
  let findings;
  try {
    findings = scanTrackedFiles();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Secret scan could not inspect tracked files: ${message}`);
    process.exitCode = 2;
    return;
  }

  if (findings.length > 0) {
    console.error("Potential secrets found in tracked source:");
    for (const { file, rule } of findings) {
      console.error(`- ${file}: ${rule}`);
    }
    console.error("Remove the credential and rotate it before committing.");
    process.exitCode = 1;
    return;
  }

  console.log("Secret scan passed: no credential patterns in tracked source.");
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) main();
