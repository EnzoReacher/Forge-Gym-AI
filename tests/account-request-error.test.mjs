import assert from "node:assert/strict";
import test from "node:test";

import {
  accountIssueFromError,
  accountIssueReference,
  accountRequestError,
  dominantAccountIssue,
  safeRequestId,
} from "../app/account-request-error.mjs";

const REQUEST_ID = "123e4567-e89b-42d3-a456-426614174000";

test("account API failures preserve only a safe server request reference", () => {
  const response = new Response(null, {
    status: 503,
    headers: { "X-Request-Id": REQUEST_ID },
  });
  const issue = accountIssueFromError(accountRequestError(response));

  assert.deepEqual(issue, { kind: "unavailable", requestId: REQUEST_ID });
  assert.equal(accountIssueReference(issue), `Reference ${REQUEST_ID}`);
  assert.equal(safeRequestId("not-a-safe-reference"), null);
});

test("account issue priority keeps the most actionable safe reference", () => {
  assert.deepEqual(
    dominantAccountIssue([
      { kind: "unavailable", requestId: REQUEST_ID },
      { kind: "access", requestId: null },
      { kind: "session", requestId: "11111111-1111-4111-8111-111111111111" },
    ]),
    { kind: "session", requestId: "11111111-1111-4111-8111-111111111111" },
  );
});

test("network and unknown failures never invent a request reference", () => {
  assert.deepEqual(accountIssueFromError(new DOMException("aborted", "AbortError")), {
    kind: "unavailable",
    requestId: null,
  });
  assert.equal(accountIssueReference({ kind: "unavailable", requestId: null }), null);
});
