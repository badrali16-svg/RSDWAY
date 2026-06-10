import { pgTable, serial, text, boolean, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const operationLogsTable = pgTable("operation_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  operation: text("operation").notNull(),
  requestPayload: text("request_payload").notNull(),
  responsePayload: text("response_payload"),
  success: boolean("success").notNull().default(false),
  notificationId: text("notification_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOperationLogSchema = createInsertSchema(operationLogsTable).omit({ id: true, createdAt: true });
export type InsertOperationLog = z.infer<typeof insertOperationLogSchema>;
export type OperationLog = typeof operationLogsTable.$inferSelect;

export const authConfigTable = pgTable("auth_config", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  username: text("username").notNull(),
  passwordEncrypted: text("password_encrypted").notNull(),
  baseUrl: text("base_url").notNull().default("https://tandttest.sfda.gov.sa"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userIdUnique: uniqueIndex("auth_config_user_id_unique").on(t.userId),
}));

export type AuthConfigRow = typeof authConfigTable.$inferSelect;
