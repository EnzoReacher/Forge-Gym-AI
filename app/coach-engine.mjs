const GOALS = new Set(["Strength", "Muscle", "Hybrid"]);
const DAYS = new Set(["3 days", "4 days", "5 days"]);
const STYLES = new Set(["Protective", "Balanced", "Relentless"]);

export const COACH_MESSAGE_MAX_LENGTH = 600;
export const COACH_POLICY_VERSION = "forge-coach-policy-2026-08-03.1";

const REPLY_KEYS = new Set(["answer", "intent", "source", "safetyLevel", "policyVersion"]);

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

function matchesAny(message, patterns) {
  return patterns.some((pattern) => pattern.test(message));
}

function styleLead(style) {
  if (style === "Protective") return "Keep the next decision conservative.";
  if (style === "Relentless") return "Do the next useful thing—without gambling with form or pain.";
  return "Use today’s evidence, then take one clear step.";
}

function reply(answer, intent, safetyLevel = "standard") {
  return {
    answer: answer.slice(0, 1_200),
    intent,
    source: "rules",
    safetyLevel,
    policyVersion: COACH_POLICY_VERSION,
  };
}

export function isCoachReply(value) {
  return Boolean(value)
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.keys(value).length === REPLY_KEYS.size
    && Object.keys(value).every((key) => REPLY_KEYS.has(key))
    && typeof value.answer === "string"
    && value.answer.length > 0
    && value.answer.length <= 1_200
    && typeof value.intent === "string"
    && value.intent.length > 0
    && value.intent.length <= 80
    && ["rules", "model"].includes(value.source)
    && ["standard", "stop", "urgent"].includes(value.safetyLevel)
    && value.policyVersion === COACH_POLICY_VERSION;
}

export function classifyCoachSafety(message) {
  const lower = normalizeMessage(message).toLocaleLowerCase("vi");
  if (!lower) return null;

  if (matchesAny(lower, [
    /\bkill myself\b/, /\bhurt myself\b/, /\bend my life\b/, /\bdon't want to live\b/,
    /\bend it all\b/, /\bsuicid(?:e|al)\b/, /tự tử/, /tự làm hại/, /không muốn sống/, /kết thúc tất cả/,
  ])) return "crisis";

  if (matchesAny(lower, [
    /\bchest pain\b/, /\bcan't breathe\b/, /\bcannot breathe\b/, /\btrouble breathing\b/,
    /\bfainted\b/, /\bfainting\b/, /\bseizure\b/, /\bone-sided weakness\b/, /\bheart attack\b/,
    /\bstroke symptoms?\b/, /\bcoughing (?:up )?blood\b/, /\bsevere bleeding\b/,
    /đau ngực/, /khó thở/, /ngất/, /co giật/, /yếu một bên/, /đột quỵ/, /ho ra máu/, /chảy máu nhiều/,
  ])) return "emergency";

  if (matchesAny(lower, [
    /\bstarve myself\b/, /\bnot eat for (?:two|three|[2-9]) days\b/, /\bhaven't eaten (?:in|for) (?:two|three|[2-9]) days\b/, /\bpurge after eating\b/,
    /\bvomit (?:my )?food\b/, /\bafraid to eat\b/, /nhịn ăn (?:hai|ba|[2-9]) ngày/,
    /nôn thức ăn/, /sợ ăn/, /bỏ ăn nhiều ngày/,
  ])) return "eating_concern";

  if (matchesAny(lower, [
    /\bsteroid (?:dose|cycle|stack)\b/, /\btestosterone (?:dose|cycle|stack)\b/, /\bhow much (?:steroid|testosterone|clenbuterol|insulin|sarms?)\b/,
    /\bclenbuterol (?:dose|cycle)\b/, /\binsulin (?:dose|cycle)\b/, /\bsarms? (?:dose|cycle|stack)\b/,
    /liều (?:steroid|testosterone|clenbuterol|insulin|sarms?)\b/, /chu kỳ (?:steroid|testosterone|clenbuterol|sarms?)\b/,
  ])) return "substance";

  if (includesAny(lower, ["pain", "hurt", "injury", "injured", "đau", "chấn thương", "sưng", "tê", "yếu bất thường"])) {
    return "injury";
  }
  return null;
}

export function buildCoachReply({ message, context } = {}) {
  const cleanMessage = normalizeMessage(message);
  const facts = normalizeCoachContext(context);
  const lower = cleanMessage.toLocaleLowerCase("vi");

  if (!cleanMessage) {
    return reply("Ask one short question about today’s training, recovery, food or progress.", "empty");
  }

  const safety = classifyCoachSafety(cleanMessage);
  if (safety === "crisis") {
    return reply(
      "Your immediate safety comes first. If you may act on these thoughts or are in danger now, contact local emergency services and stay with a trusted person. FORGE cannot provide crisis care; please reach a qualified mental-health professional as soon as possible.",
      "safety_crisis",
      "urgent",
    );
  }

  if (safety === "emergency") {
    return reply(
      "Stop training now. Chest pain, trouble breathing, fainting, a seizure or sudden one-sided weakness can require urgent medical care. Contact local emergency services or a qualified medical professional immediately. FORGE cannot diagnose the cause.",
      "safety_emergency",
      "urgent",
    );
  }

  if (safety === "eating_concern") {
    return reply(
      "I will not help intensify starvation, purging or fear-driven food restriction. Stop the cut or training demand for now, tell a trusted person, and contact a qualified medical or eating-disorder professional. If you are faint, confused, severely weak or unable to keep fluids down, seek urgent medical care.",
      "safety_eating",
      "stop",
    );
  }

  if (safety === "substance") {
    return reply(
      "FORGE will not provide a dose, cycle or stack for steroids, clenbuterol, insulin or SARMs. These can cause serious harm and require individual medical assessment. Discuss the substance and your goals with a qualified clinician; do not use a generic app answer as dosing guidance.",
      "safety_substance",
      "stop",
    );
  }

  if (safety === "injury") {
    return reply(
      "Stop the painful movement. Do not push through sharp, worsening or unfamiliar pain. If pain remains after stopping—or there is swelling, numbness, unusual weakness, chest pain, fainting or trouble breathing—seek qualified medical care. FORGE cannot diagnose an injury.",
      "safety_injury",
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
