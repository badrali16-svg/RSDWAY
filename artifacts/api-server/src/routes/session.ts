import { Router, type IRouter } from "express";
import { db, usersTable, pool } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyPassword, SETTINGS_PASSWORD, type SessionUser } from "../lib/sessionAuth";
import { randomUUID } from "crypto";

const router: IRouter = Router();

async function deleteOtherSessions(userId: number, currentSid: string): Promise<void> {
  try {
    await pool.query(
      `DELETE FROM session WHERE sid != $1 AND sess::jsonb -> 'user' ->> 'id' = $2`,
      [currentSid, String(userId)],
    );
  } catch {
    // Best-effort – do not fail the login if session cleanup fails
  }
}

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

  const sessionToken = randomUUID();

  await db.update(usersTable)
    .set({ currentSessionToken: sessionToken })
    .where(eq(usersTable.id, row.id));

  const user: SessionUser = {
    id: row.id,
    username: row.username,
    role: row.role,
    permissions: row.permissions ?? [],
    sessionToken,
  };
  req.session.user = user;

  // Save session synchronously before responding to avoid race conditions
  // where /session/me fires before the new token is persisted.
  await new Promise<void>((resolve, reject) => {
    req.session.save((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Delete all other sessions for this user so old devices are signed out
  // silently (no error message – they just see the login page).
  await deleteOtherSessions(row.id, req.sessionID);

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
  const dbToken = row.currentSessionToken;
  const sessToken = req.session.user.sessionToken;

  // If tokens don't match or are missing, silently clear the session.
  // The user will see the login page with no error – their old session
  // was replaced by a newer login on another device/browser.
  if (!dbToken || !sessToken || dbToken !== sessToken) {
    req.session.destroy(() => {});
    res.json({ user: null });
    return;
  }

  const freshUser: SessionUser = {
    id: row.id,
    username: row.username,
    role: row.role,
    permissions: row.permissions ?? [],
    sessionToken: req.session.user.sessionToken,
  };
  req.session.user = freshUser;
  res.json({ user: { id: freshUser.id, username: freshUser.username, role: freshUser.role, permissions: freshUser.permissions } });
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
