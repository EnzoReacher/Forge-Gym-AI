import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  releaseStatus,
  widerAccessBlockers,
} from "../scripts/release-status.mjs";

test("release status reports only incomplete pre-wider-access gates", async () => {
  const roadmap = await readFile(
    new URL("../docs/product/roadmap.md", import.meta.url),
    "utf8",
  );
  const blockers = widerAccessBlockers(roadmap);
  const status = releaseStatus(blockers);

  assert.equal(status.ready, false);
  assert.match(status.summary, /PRIVATE BETA ONLY/);
  assert.ok(blockers.some((item) => /deployed two-account isolation/i.test(item)));
  assert.ok(blockers.some((item) => /automated encrypted backups/i.test(item)));
  assert.ok(blockers.some((item) => /independent security review/i.test(item)));
  assert.ok(blockers.some((item) => /against the deployed runtime\.$/i.test(item)));
  assert.ok(blockers.every((item) => !/Admin Control Center/i.test(item)));
});

test("release status becomes ready only when no wider-access gate remains", () => {
  assert.deepEqual(releaseStatus([]), {
    ready: true,
    summary: "READY FOR WIDER ACCESS",
  });
});
