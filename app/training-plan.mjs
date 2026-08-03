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

const MOVEMENTS = {
  incline: ["Incline dumbbell press", "Upper chest", "Choose a comfortable load · use a pain-free range"],
  row: ["Chest-supported row", "Back", "Choose a comfortable load · pause with control"],
  shoulder: ["Seated dumbbell press", "Shoulders", "Choose a comfortable load · stop with 2 clean reps left"],
  pullup: ["Assisted pull-up", "Back", "Use enough assistance for clean reps"],
  squat: ["Goblet squat", "Quads", "Use a pain-free depth · keep the load comfortable"],
  hinge: ["Romanian deadlift", "Hamstrings", "Keep the range controlled · stop if the back or knees hurt"],
  calf: ["Standing calf raise", "Calves", "Pause at the top · lower with control"],
  curl: ["Cable curl", "Biceps", "Keep the upper arm still · avoid swinging"],
  triceps: ["Cable triceps extension", "Triceps", "Move with control · keep the elbows comfortable"],
  carry: ["Farmer carry", "Grip · Trunk", "Use a load you can carry with tall posture"],
  stepup: ["Low step-up", "Legs · Conditioning", "Use a stable low step · keep every rep pain-free"],
  deadbug: ["Dead bug", "Trunk", "Move slowly · keep the lower back controlled"],
};

const SESSION_MOVEMENTS = {
  conditioning: ["stepup", "carry", "deadbug"],
  lowerArms: ["squat", "hinge", "curl", "triceps"],
  lower: ["squat", "hinge", "calf"],
  push: ["incline", "shoulder", "triceps"],
  pull: ["pullup", "row", "curl"],
  upperCapacity: ["shoulder", "pullup", "carry"],
  upper: ["incline", "row", "shoulder"],
  full: ["squat", "incline", "row", "carry"],
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

function movementGroup(title) {
  const normalized = title.toLowerCase();
  if (normalized.includes("conditioning")) return "conditioning";
  if (normalized.includes("lower & arms")) return "lowerArms";
  if (normalized.includes("upper capacity")) return "upperCapacity";
  if (normalized.includes("lower") || normalized === "legs" || normalized.includes("legs &")) return "lower";
  if (normalized === "push" || normalized.includes("push volume")) return "push";
  if (normalized === "pull" || normalized.includes("pull volume")) return "pull";
  if (normalized.includes("upper")) return "upper";
  return "full";
}

function repTarget(goal, movementId) {
  if (movementId === "carry") return 20;
  if (movementId === "deadbug") return 8;
  if (movementId === "stepup") return 10;
  if (goal === "Strength") return 6;
  if (goal === "Muscle") return 10;
  return 8;
}

export function buildStarterSession(goal, trainingDays, requestedSlot = 1) {
  const safeGoal = normalizedGoal(goal);
  const week = buildStarterWeek(safeGoal, trainingDays);
  const sessions = week.filter((day) => day.status !== "rest");
  const parsedSlot = Number.parseInt(String(requestedSlot), 10);
  const slotIndex = Number.isFinite(parsedSlot)
    ? Math.min(Math.max(parsedSlot - 1, 0), sessions.length - 1)
    : 0;
  const selected = sessions[slotIndex];
  const movementIds = SESSION_MOVEMENTS[movementGroup(selected.title)];

  return {
    slot: slotIndex + 1,
    title: selected.title,
    focus: selected.focus,
    duration: selected.duration,
    exercises: movementIds.map((movementId) => {
      const [name, target, cue] = MOVEMENTS[movementId];
      const reps = repTarget(safeGoal, movementId);
      return {
        id: movementId,
        name,
        target,
        cue,
        sets: Array.from({ length: 3 }, () => ({ kg: 0, reps, rir: 2, done: false })),
      };
    }),
  };
}

function safePreviousSet(value) {
  if (!value || typeof value !== "object") return null;
  if (!Number.isFinite(value.kg) || value.kg < 0 || value.kg > 1_000) return null;
  if (!Number.isFinite(value.reps) || value.reps < 1 || value.reps > 1_000) return null;
  return { kg: value.kg, reps: value.reps };
}

export function prepareStarterSession(goal, trainingDays, requestedSlot, workoutHistory = []) {
  const session = buildStarterSession(goal, trainingDays, requestedSlot);
  const matchingWorkout = Array.isArray(workoutHistory)
    ? workoutHistory
      .filter((workout) => workout && workout.title === session.title && Array.isArray(workout.sets))
      .sort((left, right) => Number(right.completedAt || 0) - Number(left.completedAt || 0))[0]
    : null;

  if (!matchingWorkout) return { ...session, referenceUsed: false, referenceCompletedAt: null };

  let copiedSets = 0;
  const exercises = session.exercises.map((exercise) => {
    const previousSets = matchingWorkout.sets
      .filter((set) => set && set.exerciseName === exercise.name)
      .sort((left, right) => Number(left.position || 0) - Number(right.position || 0));

    return {
      ...exercise,
      sets: exercise.sets.map((set, index) => {
        const previous = safePreviousSet(previousSets[index]);
        if (!previous) return set;
        copiedSets += 1;
        return { ...set, ...previous, rir: 2, done: false };
      }),
    };
  });

  return {
    ...session,
    exercises,
    referenceUsed: copiedSets > 0,
    referenceCompletedAt: copiedSets > 0 && Number.isFinite(matchingWorkout.completedAt)
      ? matchingWorkout.completedAt
      : null,
  };
}
