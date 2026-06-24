import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyPassword, SETTINGS_PASSWORD, type SessionUser } from "../lib/sessionAuth";
import { randomUUID } from "crypto";

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

  // Explicitly save the session before responding so the new sessionToken is
  // persisted in PostgreSQL before the client fires its next /me request.
  // Without this, a race condition causes SESSION_REPLACED on the very next
  // request because the session store still holds the old token.
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

  // Only signal SESSION_REPLACED when both tokens are present and differ.
  // If either is missing (old session pre-feature, or token not yet set),
  // silently clear the session so the user gets a clean login prompt.
  const dbToken = row.currentSessionToken;
  const sessToken = req.session.user.sessionToken;
  if (dbToken && sessToken && dbToken !== sessToken) {
    req.session.destroy(() => {});
    res.json({ user: null, reason: "SESSION_REPLACED" });
    return;
  }
  if (!dbToken || !sessToken) {
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
