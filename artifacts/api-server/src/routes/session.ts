import { Router, type IRouter } from "express";
import { db, usersTable, pool } from "@workspace/db";
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
  if (!row.isActive) {
    res.status(403).json({ error: "Account is inactive. Please contact the administrator." });
    return;
  }
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

  await new Promise<void>((resolve, reject) => {
    req.session.save((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  res.json({ id: user.id, username: user.username, role: user.role, permissions: user.permissions });
});

router.post("/session/logout", (req, res): void => {
  req.session.destroy(() => {
    res.clearCookie("rasid.sid");
    res.json({ ok: true });
  });
});

router.get("/session/me", async (req, res): Promise<void> => {
  res.set("Cache-Control", "no-store");

  if (!req.session?.user) {
    res.json({ user: null });
    return;
  }

  const rows = await db.select().from(usersTable).where(eq(usersTable.id, req.session.user.id)).limit(1);
  if (rows.length === 0 || !rows[0].isActive) {
    req.session.destroy(() => {});
    res.json({ user: null });
    return;
  }

  const row = rows[0];
  const freshUser: SessionUser = {
    id: row.id,
    username: row.username,
    role: row.role,
    permissions: row.permissions ?? [],
  };
  req.session.user = freshUser;
  res.json({ user: { id: freshUser.id, username: freshUser.username, role: freshUser.role, permissions: freshUser.permissions } });
});

// Emergency endpoint: verifies credentials then wipes ALL sessions for that user
// so the user can log in fresh from any device/browser.
router.post("/session/reset", async (req, res): Promise<void> => {
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
  if (!row.isActive) {
    res.status(403).json({ error: "Account is inactive" });
    return;
  }
  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  try {
    await pool.query(
      `DELETE FROM session WHERE sess::jsonb -> 'user' ->> 'id' = $1`,
      [String(row.id)],
    );
  } catch {
    // Best-effort
  }
  res.json({ ok: true });
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
