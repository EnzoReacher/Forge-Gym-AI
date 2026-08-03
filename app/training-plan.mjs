const DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const TRAINING_POSITIONS = {
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
};

const PROGRAMS = {
  Strength: {
    3: [
      ["Upper strength", "Chest · Back", "70 min"],
      ["Lower strength", "Hinge · Legs", "70 min"],
      ["Full-body strength", "Push · Pull · Carry", "75 min"],
    ],
    4: [
      ["Upper strength", "Chest · Back", "65 min"],
      ["Lower strength", "Hinge · Legs", "65 min"],
      ["Upper volume", "Shoulders · Arms", "60 min"],
      ["Lower volume", "Quads · Posterior chain", "60 min"],
    ],
    5: [
      ["Upper strength", "Chest · Back", "55 min"],
      ["Lower strength", "Hinge · Legs", "55 min"],
      ["Push volume", "Chest · Shoulders", "50 min"],
      ["Pull volume", "Back · Arms", "50 min"],
      ["Legs & carries", "Legs · Trunk", "55 min"],
    ],
  },
  Muscle: {
    3: [
      ["Upper hypertrophy", "Chest · Back", "70 min"],
      ["Lower hypertrophy", "Quads · Hamstrings", "70 min"],
      ["Full-body volume", "Delts · Arms · Legs", "75 min"],
    ],
    4: [
      ["Upper A", "Chest · Back", "65 min"],
      ["Lower A", "Quads · Calves", "65 min"],
      ["Upper B", "Shoulders · Arms", "65 min"],
      ["Lower B", "Hamstrings · Glutes", "65 min"],
    ],
    5: [
      ["Push", "Chest · Shoulders", "55 min"],
      ["Pull", "Back · Biceps", "55 min"],
      ["Legs", "Quads · Hamstrings", "60 min"],
      ["Upper volume", "Chest · Back · Delts", "55 min"],
      ["Lower & arms", "Legs · Arms", "55 min"],
    ],
  },
  Hybrid: {
    3: [
      ["Full-body strength", "Push · Pull · Legs", "65 min"],
      ["Conditioning", "Intervals · Trunk", "45 min"],
      ["Strength & capacity", "Full body · Carries", "70 min"],
    ],
    4: [
      ["Upper strength", "Chest · Back", "60 min"],
      ["Lower strength", "Hinge · Legs", "60 min"],
      ["Conditioning", "Intervals · Trunk", "45 min"],
      ["Full-body capacity", "Push · Pull · Carry", "65 min"],
    ],
    5: [
      ["Upper strength", "Chest · Back", "55 min"],
      ["Lower strength", "Hinge · Legs", "55 min"],
      ["Conditioning", "Intervals · Trunk", "40 min"],
      ["Upper capacity", "Shoulders · Arms", "50 min"],
      ["Lower capacity", "Legs · Carries", "50 min"],
    ],
  },
};

function normalizedGoal(goal) {
  return Object.hasOwn(PROGRAMS, goal) ? goal : "Strength";
}

function normalizedDays(trainingDays) {
  const count = Number.parseInt(String(trainingDays), 10);
  return Object.hasOwn(TRAINING_POSITIONS, count) ? count : 3;
}

export function buildStarterWeek(goal, trainingDays) {
  const safeGoal = normalizedGoal(goal);
  const dayCount = normalizedDays(trainingDays);
  const positions = TRAINING_POSITIONS[dayCount];
  const sessions = PROGRAMS[safeGoal][dayCount];

  return DAY_NAMES.map((day, dayIndex) => {
    const sessionIndex = positions.indexOf(dayIndex);
    if (sessionIndex >= 0) {
      const [title, focus, duration] = sessions[sessionIndex];
      return {
        day,
        slot: String(sessionIndex + 1).padStart(2, "0"),
        title,
        focus,
        duration,
        status: sessionIndex === 0 ? "focus" : "next",
      };
    }

    const fullRest = day === "SUN";
    return {
      day,
      slot: "—",
      title: fullRest ? "Full rest" : "Recovery",
      focus: fullRest ? "Walk · Reset" : "Easy movement · Mobility",
      duration: fullRest ? "—" : "20–30 min",
      status: "rest",
    };
  });
}
