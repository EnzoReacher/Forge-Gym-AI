import { sql } from "drizzle-orm";
import {
  index,
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
