import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.session?.user) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }
  const { sessionToken, id } = req.session.user;
  const rows = await db
    .select({ tok: usersTable.currentSessionToken, active: usersTable.isActive })
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);
  if (rows.length === 0 || !rows[0].active || rows[0].tok !== sessionToken) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "SESSION_REPLACED" });
    return;
  }
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.session?.user) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }
  const { sessionToken, id } = req.session.user;
  const rows = await db
    .select({ tok: usersTable.currentSessionToken, active: usersTable.isActive, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);
  if (rows.length === 0 || !rows[0].active || rows[0].tok !== sessionToken) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "SESSION_REPLACED" });
    return;
  }
  if (req.session.user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  next();
}
