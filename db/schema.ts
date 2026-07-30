import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    identityName: text("identity_name"),
    role: text("role", { enum: ["athlete", "coach", "support", "admin"] })
      .notNull()
      .default("athlete"),
    status: text("status", { enum: ["active", "suspended", "deleted"] })
      .notNull()
      .default("active"),
    plan: text("plan", { enum: ["free", "pro", "premium"] })
      .notNull()
      .default("free"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    index("users_status_idx").on(table.status),
  ],
);

export const userData = sqliteTable(
  "user_data",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    valueJson: text("value_json").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("user_data_owner_key_unique").on(table.userId, table.key),
    index("user_data_owner_idx").on(table.userId),
  ],
);

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    reason: text("reason"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("audit_events_actor_idx").on(table.actorUserId),
    index("audit_events_created_idx").on(table.createdAt),
  ],
);

export const workouts = sqliteTable(
  "workouts",
  {
    id: text("id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    completedAt: integer("completed_at").notNull(),
    title: text("title").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    completedSets: integer("completed_sets").notNull(),
    totalSets: integer("total_sets").notNull(),
    exerciseCount: integer("exercise_count").notNull(),
    volume: integer("volume").notNull(),
    averageRir: integer("average_rir_milli").notNull(),
    bestSet: text("best_set").notNull(),
    note: text("note").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    correctedAt: text("corrected_at"),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    index("workouts_owner_completed_idx").on(table.userId, table.completedAt),
  ],
);

export const workoutSets = sqliteTable(
  "workout_sets",
  {
    id: text("id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workoutId: text("workout_id").notNull(),
    exerciseId: text("exercise_id").notNull(),
    exerciseName: text("exercise_name").notNull(),
    position: integer("position").notNull(),
    weightGrams: integer("weight_grams").notNull(),
    reps: integer("reps").notNull(),
    rirMilli: integer("rir_milli").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    index("workout_sets_owner_workout_idx").on(table.userId, table.workoutId),
  ],
);

export const meals = sqliteTable(
  "meals",
  {
    id: text("id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recordedAt: integer("recorded_at").notNull(),
    time: text("time").notNull(),
    name: text("name").notNull(),
    detail: text("detail").notNull().default(""),
    kcal: integer("kcal").notNull(),
    proteinGrams: integer("protein_grams").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    correctedAt: text("corrected_at"),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    index("meals_owner_recorded_idx").on(table.userId, table.recordedAt),
  ],
);

export const hydrationEntries = sqliteTable(
  "hydration_entries",
  {
    id: text("id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recordedAt: integer("recorded_at").notNull(),
    amountMl: integer("amount_ml").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    correctedAt: text("corrected_at"),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    index("hydration_owner_recorded_idx").on(table.userId, table.recordedAt),
  ],
);
