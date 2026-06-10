import { pgTable, serial, text, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  gln: text("gln").notNull(),
  glnOwnerName: text("gln_owner_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userGlnUnique: uniqueIndex("clients_user_gln_unique").on(t.userId, t.gln),
}));

export type ClientRow = typeof clientsTable.$inferSelect;
export type NewClientRow = typeof clientsTable.$inferInsert;
