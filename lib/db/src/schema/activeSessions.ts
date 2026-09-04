import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const activeSessionsTable = pgTable("active_sessions", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  deviceId: text("device_id").notNull(),
  sessionToken: text("session_token").notNull().unique(),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
});

export type ActiveSessionRow = typeof activeSessionsTable.$inferSelect;
export type NewActiveSessionRow = typeof activeSessionsTable.$inferInsert;