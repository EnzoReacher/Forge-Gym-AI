import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routeUrl = new URL("../app/api/coach/route.ts", import.meta.url);
const pageUrl = new URL("../app/page.tsx", import.meta.url);

test("the Coach route is authenticated, exact-origin, bounded and owner-rate-limited", async () => {
  const route = await readFile(routeUrl, "utf8");
  assert.match(route, /mutationRequestProblem\(request, \{ requiresJson: true \}\)/);
  assert.match(route, /getCurrentActiveAccount\(\)/);
  assert.match(route, /ownerId: auth\.account\.id/);
  assert.match(route, /action: "coach_message"/);
  assert.match(route, /COACH_REQUEST_LIMIT = 30/);
  assert.match(route, /MAX_BODY_BYTES = 10_000/);
  assert.match(route, /hasOnlyKeys\(payload\.value, ALLOWED_PAYLOAD_KEYS\)/);
  assert.match(route, /"Cache-Control": "no-store"/);
  assert.match(route, /observeApiRequest\(\s*"coach_reply"/);
});

test("the Coach foundation makes no external model call and has a local safety fallback", async () => {
  const [route, page] = await Promise.all([readFile(routeUrl, "utf8"), readFile(pageUrl, "utf8")]);
  assert.doesNotMatch(route, /openai|anthropic|gemini|api[_-]?key|fetch\(/i);
  assert.match(page, /requestCoachReply\(\{ message: text, context: coachContext \}\)/);
  assert.match(page, /buildCoachReply\(\{ message: text, context: coachContext \}\)/);
  assert.match(page, /if \(!text \|\| pending/);
  assert.match(page, /This beta chat is not saved to your account/);
  assert.match(page, /maxLength=\{COACH_MESSAGE_MAX_LENGTH\}/);
});
