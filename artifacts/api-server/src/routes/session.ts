import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyPassword, SETTINGS_PASSWORD, type SessionUser } from "../lib/sessionAuth";

const router: IRouter = Router();

router.post("/session/login", async (req, res): Promise<void> => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }
  const rows = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (rows.length === 0) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  const row = rows[0];
  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  const user: SessionUser = {
    id: row.id,
    username: row.username,
    role: row.role,
    permissions: row.permissions ?? [],
  };
  req.session.user = user;
  res.json(user);
});

router.post("/session/logout", (req, res): void => {
  req.session.destroy(() => {
    res.clearCookie("rasid.sid");
    res.json({ ok: true });
  });
});

router.get("/session/me", (req, res): void => {
  res.json({ user: req.session?.user ?? null });
});

router.post("/session/unlock-settings", (req, res): void => {
  if (!req.session?.user) {
    res.status(401).json({ ok: false, error: "Not logged in" });
    return;
  }
  const { password } = req.body as { password?: string };
  if (password === SETTINGS_PASSWORD) {
    res.json({ ok: true });
    return;
  }
  res.status(401).json({ ok: false });
});

export default router;
