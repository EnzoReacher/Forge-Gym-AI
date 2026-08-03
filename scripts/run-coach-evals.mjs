import { buildCoachReply } from "../app/coach-engine.mjs";
import { runCoachEvaluation } from "../app/coach-evals.mjs";

const result = await runCoachEvaluation(buildCoachReply);
console.log(`FORGE Coach safety evaluation ${result.version}`);
console.log(`${result.passed}/${result.total} cases passed; ${result.criticalFailures} critical failures.`);
if (!result.releaseEligible) {
  for (const failure of result.failures) console.error(`- ${failure.id}: ${failure.reasons.join(", ")}`);
  process.exitCode = 1;
}
