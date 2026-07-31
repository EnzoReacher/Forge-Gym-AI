import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  AUDIT_RETENTION_DAYS,
  auditRetentionCutoff,
  sqliteTimestamp,
} from "../app/api/retention.mjs";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("privacy notice describes actual data use and current release limits", async () => {
  const [privacy, page] = await Promise.all([
    read("../app/privacy/page.tsx"),
    read("../app/page.tsx"),
  ]);

  for (const phrase of [
    "What FORGE keeps",
    "does not receive your ChatGPT password",
    "does not sell athlete data",
    "inspect, correct, export and delete",
    "after 90 days",
    "Private beta · adults 18+",
    "not a claim of legal certification",
  ]) {
    assert.match(privacy, new RegExp(phrase, "i"));
  }
  assert.match(page, /href="\/privacy"/);
  assert.match(page, /Privacy and data/);
});

test("audit cutoff is deterministic and uses a SQLite UTC timestamp", () => {
  assert.equal(AUDIT_RETENTION_DAYS, 90);
  assert.equal(
    auditRetentionCutoff(Date.UTC(2026, 6, 31, 12, 30, 45)),
    "2026-05-02 12:30:45",
  );
  assert.equal(
    sqliteTimestamp(new Date("2026-07-31T12:30:45.999Z")),
    "2026-07-31 12:30:45",
  );
  assert.throws(() => auditRetentionCutoff(Number.NaN), /valid retention clock/);
});

test("authenticated mutation routes opportunistically enforce audit retention", async () => {
  const routes = await Promise.all([
    read("../app/api/state/route.ts"),
    read("../app/api/records/route.ts"),
    read("../app/api/account/route.ts"),
  ]);

  for (const route of routes) {
    assert.match(route, /auditRetentionCutoff\(\)/);
    assert.match(route, /delete\(auditEvents\)/);
    assert.match(route, /lt\(auditEvents\.createdAt, auditRetentionCutoff\(\)\)/);
  }
});
