const GOALS = new Set(["Strength", "Muscle", "Hybrid"]);
const DAYS = new Set(["3 days", "4 days", "5 days"]);
const STYLES = new Set(["Protective", "Balanced", "Relentless"]);

export const COACH_MESSAGE_MAX_LENGTH = 600;

function boundedInteger(value, min, max, fallback = 0) {
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

function normalizeMessage(value) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, COACH_MESSAGE_MAX_LENGTH)
    : "";
}

export function normalizeCoachContext(value) {
  const context = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    doneSets: boundedInteger(context.doneSets, 0, 1_000),
    totalSets: boundedInteger(context.totalSets, 0, 1_000),
    proteinGrams: boundedInteger(context.proteinGrams, 0, 2_000),
    mealCount: boundedInteger(context.mealCount, 0, 100),
    goal: GOALS.has(context.goal) ? context.goal : "Hybrid",
    trainingDays: DAYS.has(context.trainingDays) ? context.trainingDays : "3 days",
    style: STYLES.has(context.style) ? context.style : "Balanced",
  };
}

function includesAny(message, words) {
  return words.some((word) => message.includes(word));
}

function styleLead(style) {
  if (style === "Protective") return "Keep the next decision conservative.";
  if (style === "Relentless") return "Do the next useful thing—without gambling with form or pain.";
  return "Use today’s evidence, then take one clear step.";
}

function reply(answer, intent, safetyLevel = "standard") {
  return { answer: answer.slice(0, 1_200), intent, source: "rules", safetyLevel };
}

export function buildCoachReply({ message, context } = {}) {
  const cleanMessage = normalizeMessage(message);
  const facts = normalizeCoachContext(context);
  const lower = cleanMessage.toLocaleLowerCase("vi");

  if (!cleanMessage) {
    return reply("Ask one short question about today’s training, recovery, food or progress.", "empty");
  }

  if (includesAny(lower, ["pain", "hurt", "injury", "injured", "đau", "chấn thương", "sưng", "tê", "yếu bất thường"])) {
    return reply(
      "Stop the painful movement. Do not push through sharp, worsening or unfamiliar pain. If pain remains after stopping—or there is swelling, numbness, unusual weakness, chest pain, fainting or trouble breathing—seek qualified medical care. FORGE cannot diagnose an injury.",
      "safety",
      "stop",
    );
  }

  if (includesAny(lower, ["dinner", "meal", "protein", "ăn", "bữa", "đạm"])) {
    if (!facts.mealCount) {
      return reply(
        `${styleLead(facts.style)} No meals are logged today, so I will not guess what you ate. A simple meal can be one protein source, a carbohydrate, vegetables and water. Log the meal if you want a more grounded review.`,
        "nutrition",
      );
    }
    const proteinLeft = Math.max(0, 190 - facts.proteinGrams);
    return reply(
      `${styleLead(facts.style)} You logged ${facts.proteinGrams} g of protein. Against FORGE’s current 190 g default—not a medical prescription—that leaves about ${proteinLeft} g. Keep the next meal simple: a protein source, a carbohydrate, vegetables and water; adjust portions to your needs.`,
      "nutrition",
    );
  }

  if (includesAny(lower, ["tired", "fatigue", "recovery", "sleep", "mệt", "hồi phục", "ngủ"])) {
    return reply(
      `${styleLead(facts.style)} FORGE does not have a verified sleep or recovery record here, so it cannot score your readiness. If warm-ups feel unusually heavy, keep the planned work but reduce load or sets; stop if technique breaks or pain appears.`,
      "recovery",
    );
  }

  if (includesAny(lower, ["progress", "increase", "heavier", "load", "tăng tạ", "tiến bộ", "nặng hơn"])) {
    return reply(
      `${styleLead(facts.style)} One day is not enough evidence to raise the plan automatically. Repeat clean work, compare technique, reps left and recent sessions, then make one small change at a time.`,
      "progress",
    );
  }

  if (!facts.totalSets) {
    return reply(
      `${styleLead(facts.style)} No working sets are available in today’s session, so I will not invent a workout result. Open Training and prepare a planned session first.`,
      "today",
    );
  }

  const next = facts.doneSets >= facts.totalSets
    ? "All planned working sets are marked complete. Save the workout before changing the plan."
    : `You logged ${facts.doneSets} of ${facts.totalSets} working sets. Continue with the next planned set only if the movement is pain-free and technique stays clean.`;
  return reply(`${styleLead(facts.style)} ${next}`, "today");
}
