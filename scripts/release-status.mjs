import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const ROADMAP_URL = new URL("../docs/product/roadmap.md", import.meta.url);

export function widerAccessBlockers(markdown) {
  const start = markdown.indexOf("## Now —");
  const end = markdown.indexOf("## Later —");
  if (start < 0 || end <= start) {
    throw new Error("The release-gate sections are missing from the roadmap.");
  }

  const blockers = [];
  let active = -1;

  for (const line of markdown.slice(start, end).split("\n")) {
    if (line.startsWith("- [ ] ")) {
      blockers.push(line.slice(6).trim());
      active = blockers.length - 1;
    } else if (line.startsWith("- [")) {
      active = -1;
    } else if (active >= 0 && line.startsWith("  ")) {
      blockers[active] += ` ${line.trim()}`;
    } else if (!line.trim()) {
      active = -1;
    }
  }

  return blockers;
}

export function releaseStatus(blockers) {
  return blockers.length === 0
    ? { ready: true, summary: "READY FOR WIDER ACCESS" }
    : {
        ready: false,
        summary: `PRIVATE BETA ONLY — ${blockers.length} release gate${blockers.length === 1 ? "" : "s"} remain`,
      };
}

async function main() {
  const markdown = await readFile(ROADMAP_URL, "utf8");
  const blockers = widerAccessBlockers(markdown);
  const status = releaseStatus(blockers);

  console.log(status.summary);
  for (const [index, blocker] of blockers.entries()) {
    console.log(`${index + 1}. ${blocker}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Unable to read release status.");
    process.exitCode = 1;
  });
}
