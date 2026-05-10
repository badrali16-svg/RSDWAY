import { Router, type IRouter } from "express";
import { db, usersTable, authConfigTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { hashPassword, ALL_PERMISSIONS } from "../lib/sessionAuth";
import { requireAdmin } from "../middlewares/requireAuth";

const router: IRouter = Router();

function toSummary(row: typeof usersTable.$inferSelect) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    permissions: row.permissions ?? [],
    createdAt: row.createdAt.toISOString(),
  };
}

function sanitisePermissions(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const allowed = new Set<string>(ALL_PERMISSIONS as readonly string[]);
  return input.filter((v): v is string => typeof v === "string" && allowed.has(v));
}

router.get("/users", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(usersTable).orderBy(asc(usersTable.id));
  res.json(rows.map(toSummary));
});

router.post("/users", requireAdmin, async (req, res): Promise<void> => {
  const { username, password, permissions, dttsConfig } = req.body as {
    username?: string;
    password?: string;
    permissions?: unknown;
    dttsConfig?: { username?: string; password?: string; baseUrl?: string };
  };
  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Username already exists" });
    return;
  }
  const passwordHash = await hashPassword(password);
  const [row] = await db
    .insert(usersTable)
    .values({
      username,
      passwordHash,
      role: "client",
      permissions: sanitisePermissions(permissions),
    })
    .returning();

  // Save DTTS credentials for the new user if provided
  if (dttsConfig?.username && dttsConfig?.password) {
    await db.insert(authConfigTable).values({
      userId: row.id,
      username: dttsConfig.username,
      passwordEncrypted: dttsConfig.password,
      baseUrl: dttsConfig.baseUrl || "https://rsd.sfda.gov.sa/ws",
    });
  }

  res.json(toSummary(row));
});

router.patch("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (existing.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (existing[0].role === "admin") {
    res.status(403).json({ error: "Cannot modify admin user" });
    return;
  }
  const { password, permissions } = req.body as { password?: string | null; permissions?: unknown };
  const updates: Partial<typeof usersTable.$inferInsert> = {
    permissions: sanitisePermissions(permissions),
  };
  if (password) {
    updates.passwordHash = await hashPassword(password);
  }
  const [row] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  res.json(toSummary(row));
});

router.delete("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (existing.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (existing[0].role === "admin") {
    res.status(403).json({ error: "Cannot delete admin user" });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ ok: true });
});

export default router;
