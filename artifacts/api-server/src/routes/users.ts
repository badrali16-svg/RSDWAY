import { Router, type IRouter } from "express";
import { db, usersTable, authConfigTable, sessionTable } from "@workspace/db";
import { eq, asc, sql } from "drizzle-orm";
import { hashPassword, ALL_PERMISSIONS } from "../lib/sessionAuth";
import { requireAdmin } from "../middlewares/requireAuth";

const router: IRouter = Router();

function toSummary(row: typeof usersTable.$inferSelect) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    permissions: row.permissions ?? [],
    isActive: row.isActive ?? true,
    createdAt: row.createdAt.toISOString(),
  };
}

function sanitisePermissions(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const allowed = new Set<string>(ALL_PERMISSIONS as readonly string[]);
  return input.filter((v): v is string => typeof v === "string" && allowed.has(v));
}

async function invalidateUserSessions(userId: number): Promise<void> {
  await db.delete(sessionTable).where(
    sql`(${sessionTable.sess}->'user'->>'id')::int = ${userId}`
  );
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

router.get("/users/:id/auth-config", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const rows = await db.select().from(authConfigTable).where(eq(authConfigTable.userId, id)).limit(1);
  if (rows.length === 0) {
    res.json({ username: "", hasPassword: false, baseUrl: "https://rsd.sfda.gov.sa/ws" });
    return;
  }
  const row = rows[0];
  res.json({ username: row.username, hasPassword: !!row.passwordEncrypted, baseUrl: row.baseUrl });
});

router.post("/users/:id/auth-config", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const userRows = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (userRows.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const { username, password, baseUrl } = req.body as { username: string; password: string; baseUrl: string };
  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }
  const finalBaseUrl = baseUrl || "https://rsd.sfda.gov.sa/ws";
  const existing = await db.select().from(authConfigTable).where(eq(authConfigTable.userId, id)).limit(1);
  if (existing.length > 0) {
    await db
      .update(authConfigTable)
      .set({ username, passwordEncrypted: password, baseUrl: finalBaseUrl, updatedAt: new Date() })
      .where(eq(authConfigTable.userId, id));
  } else {
    await db.insert(authConfigTable).values({ userId: id, username, passwordEncrypted: password, baseUrl: finalBaseUrl });
  }
  res.json({ username, hasPassword: true, baseUrl: finalBaseUrl });
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
    updates.currentSessionToken = null;
    await invalidateUserSessions(id);
  }
  const [row] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  res.json(toSummary(row));
});

router.patch("/users/:id/status", requireAdmin, async (req, res): Promise<void> => {
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
    res.status(403).json({ error: "Cannot change admin status" });
    return;
  }
  const { isActive } = req.body as { isActive?: boolean };
  if (typeof isActive !== "boolean") {
    res.status(400).json({ error: "isActive must be a boolean" });
    return;
  }
  if (!isActive) {
    await invalidateUserSessions(id);
  }
  const [row] = await db.update(usersTable).set({ isActive }).where(eq(usersTable.id, id)).returning();
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
  await invalidateUserSessions(id);
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ ok: true });
});

export default router;
