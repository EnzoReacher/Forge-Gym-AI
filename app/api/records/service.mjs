const RECORD_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{7,79}$/;

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finite(value, min, max) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function text(value, max, required = true) {
  return typeof value === "string" && value.length <= max && (!required || value.trim().length > 0);
}

function id(value) {
  return typeof value === "string" && RECORD_ID.test(value);
}

function validSet(value) {
  return (
    isObject(value) &&
    id(value.id) &&
    text(value.exerciseId, 80) &&
    text(value.exerciseName, 120) &&
    finite(value.position, 0, 999) &&
    finite(value.kg, 0, 1_000) &&
    finite(value.reps, 1, 1_000) &&
    finite(value.rir, 0, 10)
  );
}

function validWorkout(record) {
  return (
    isObject(record) &&
    id(record.id) &&
    finite(record.completedAt, 1, Number.MAX_SAFE_INTEGER) &&
    text(record.title, 120) &&
    finite(record.durationSeconds, 1, 172_800) &&
    finite(record.completedSets, 1, 1_000) &&
    finite(record.totalSets, record.completedSets, 1_000) &&
    finite(record.exerciseCount, 1, 100) &&
    finite(record.volume, 0, 100_000_000) &&
    finite(record.averageRir, 0, 10) &&
    text(record.bestSet, 240) &&
    text(record.note, 2_000, false) &&
    Array.isArray(record.sets) &&
    record.sets.length === record.completedSets &&
    record.sets.length <= 100 &&
    record.sets.every(validSet)
  );
}

function validMeal(record) {
  return (
    isObject(record) &&
    id(record.id) &&
    finite(record.recordedAt, 1, Number.MAX_SAFE_INTEGER) &&
    text(record.time, 8) &&
    text(record.name, 120) &&
    text(record.detail, 300, false) &&
    finite(record.kcal, 0, 20_000) &&
    finite(record.protein, 0, 2_000)
  );
}

function validHydration(record) {
  return (
    isObject(record) &&
    id(record.id) &&
    finite(record.recordedAt, 1, Number.MAX_SAFE_INTEGER) &&
    Number.isInteger(record.amountMl) &&
    record.amountMl >= -3_200 &&
    record.amountMl <= 3_200 &&
    record.amountMl !== 0
  );
}

export function validRecord(type, record) {
  if (type === "workout") return validWorkout(record);
  if (type === "meal") return validMeal(record);
  if (type === "hydration") return validHydration(record);
  return false;
}

export function validDelete(type, recordId) {
  return ["workout", "meal", "hydration"].includes(type) && id(recordId);
}

export function workoutRows(ownerId, record) {
  return {
    workout: {
      id: record.id,
      userId: ownerId,
      completedAt: Math.round(record.completedAt),
      title: record.title.trim(),
      durationSeconds: Math.round(record.durationSeconds),
      completedSets: Math.round(record.completedSets),
      totalSets: Math.round(record.totalSets),
      exerciseCount: Math.round(record.exerciseCount),
      volume: Math.round(record.volume),
      averageRir: Math.round(record.averageRir * 1_000),
      bestSet: record.bestSet.trim(),
      note: record.note.trim(),
    },
    sets: record.sets.map((set) => ({
      id: set.id,
      userId: ownerId,
      workoutId: record.id,
      exerciseId: set.exerciseId,
      exerciseName: set.exerciseName.trim(),
      position: Math.round(set.position),
      weightGrams: Math.round(set.kg * 1_000),
      reps: Math.round(set.reps),
      rirMilli: Math.round(set.rir * 1_000),
    })),
  };
}

export function publicWorkout(workout, sets) {
  return {
    id: workout.id,
    completedAt: workout.completedAt,
    title: workout.title,
    durationSeconds: workout.durationSeconds,
    completedSets: workout.completedSets,
    totalSets: workout.totalSets,
    exerciseCount: workout.exerciseCount,
    volume: workout.volume,
    averageRir: workout.averageRir / 1_000,
    bestSet: workout.bestSet,
    note: workout.note,
    correctedAt: workout.correctedAt ?? null,
    sets: sets
      .filter((set) => set.workoutId === workout.id)
      .sort((a, b) => a.position - b.position)
      .map((set) => ({
        id: set.id,
        exerciseId: set.exerciseId,
        exerciseName: set.exerciseName,
        position: set.position,
        kg: set.weightGrams / 1_000,
        reps: set.reps,
        rir: set.rirMilli / 1_000,
      })),
  };
}

export function publicMeal(meal) {
  return {
    id: meal.id,
    recordedAt: meal.recordedAt,
    time: meal.time,
    name: meal.name,
    detail: meal.detail,
    kcal: meal.kcal,
    protein: meal.proteinGrams,
    correctedAt: meal.correctedAt ?? null,
  };
}

export function publicHydration(entry) {
  return {
    id: entry.id,
    recordedAt: entry.recordedAt,
    amountMl: entry.amountMl,
    correctedAt: entry.correctedAt ?? null,
  };
}
